import { prisma } from "@/lib/db"
import { createHash } from "node:crypto"
import { runAllRules, type AgentRunSummary, type DetectionContext } from "./detection-rules"
import { sendAdminNotification } from "@/lib/admin-notifier/admin-notifier"
import { enqueueJob } from "@/lib/jobs/enqueue"

function computeIdempotencyKey(boardId: string, leadId: string, ruleId: string, evidence: Record<string, unknown>): string {
  const fingerprint = JSON.stringify({ stateId: evidence.stateId, runIds: evidence.runIds, consecutiveRuns: evidence.consecutiveRuns })
  const raw = `${boardId}:${leadId}:${ruleId}:${fingerprint}`
  return createHash("sha256").update(raw).digest("hex").slice(0, 16)
}

async function isDuplicate(boardId: string, leadId: string, idempotencyKey: string, withinMs = 3600000): Promise<boolean> {
  const since = new Date(Date.now() - withinMs)
  const existing = await prisma.supervisorAction.findMany({
    where: {
      boardId,
      leadId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, triggerContext: true },
    take: 20,
  })
  for (const item of existing) {
    const ctx = item.triggerContext as Record<string, unknown> | null
    if (!ctx) continue
    // Skip if snoozed
    const snoozedUntil = ctx.snoozedUntil as string | undefined
    if (snoozedUntil && new Date(snoozedUntil) > new Date()) continue
    if (ctx.idempotencyKey === idempotencyKey) return true
  }
  return false
}

async function getBoardAdmin(boardId: string): Promise<{ userId: string; chatId: string } | null> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      members: {
        where: { role: "ADMIN" },
        select: { userId: true },
        take: 1,
      },
    },
  })
  const adminMemberId = board?.members[0]?.userId
  if (!adminMemberId) return null

  const user = await prisma.user.findUnique({
    where: { id: adminMemberId },
    select: { id: true, adminTelegramChatId: true },
  })
  if (!user?.adminTelegramChatId) return null

  return { userId: user.id, chatId: user.adminTelegramChatId }
}

type ScanResult = { boardId: string; highCount: number; mediumCount: number; lowCount: number }

export async function scanBoard(boardId: string): Promise<ScanResult> {
  const high: Array<{ ruleId: string; leadId: string; evidence: Record<string, unknown>; suggestedAction: string; severity: string; ruleLabel: string; actionId: string }> = []
  const medium: typeof high = []
  const low: typeof high = []

  // Get leads with recent AgentRuns
  const leads = await prisma.lead.findMany({
    where: { boardId },
    select: { id: true, name: true, currentStateId: true },
  })

  if (leads.length === 0) return { boardId, highCount: 0, mediumCount: 0, lowCount: 0 }

  // Compute board average cost for cost spike rule
  const boardAvg = await prisma.agentRun.aggregate({
    where: { boardId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    _avg: { costCents: true },
  })
  const boardAvgCostCents = boardAvg._avg.costCents ?? 0

  // Find board's initial state
  const initialState = await prisma.state.findFirst({
    where: { boardId, type: "MESSAGE", orderIndex: 0 },
    select: { id: true },
    orderBy: { orderIndex: "asc" },
  })

  const context: DetectionContext = {
    boardAvgCostCents,
    initialStateId: initialState?.id ?? null,
  }

  for (const lead of leads) {
    const agentRuns = await prisma.agentRun.findMany({
      where: { leadId: lead.id, boardId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        stateId: true,
        outcome: true,
        handoffProposed: true,
        agentConfidence: true,
        costCents: true,
        errorMessage: true,
        createdAt: true,
        toolCallsMade: true,
      },
    })

    if (agentRuns.length === 0) continue

    const runs: AgentRunSummary[] = agentRuns.map((r) => ({
      id: r.id,
      stateId: r.stateId,
      outcome: r.outcome,
      handoffProposed: r.handoffProposed,
      agentConfidence: r.agentConfidence,
      costCents: r.costCents,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
      toolCallsMade: (r.toolCallsMade as Array<{ name: string; args: unknown; error?: string }>) ?? [],
    }))

    const detections = runAllRules(runs, context)

    for (const detection of detections) {
      const idempotencyKey = computeIdempotencyKey(boardId, lead.id, detection.ruleId, detection.evidence)
      if (await isDuplicate(boardId, lead.id, idempotencyKey)) continue

      const action = await prisma.supervisorAction.create({
        data: {
          boardId,
          leadId: lead.id,
          triggerType: "PERIODIC_AUDIT_FINDING",
          triggerContext: JSON.parse(JSON.stringify({ idempotencyKey, ...detection.evidence, ruleId: detection.ruleId, ruleLabel: detection.ruleLabel })),
          proposedAction: detection.suggestedAction,
          actionParams: JSON.parse(JSON.stringify(detection.evidence)),
          reasoning: `[${detection.ruleLabel}] ${JSON.stringify(detection.evidence)}`,
          urgency: detection.severity === "high" ? "HIGH" : detection.severity === "medium" ? "NORMAL" : "LOW",
          status: "PENDING_ADMIN",
        },
      })

      const entry = {
        ruleId: detection.ruleId,
        leadId: lead.id,
        evidence: detection.evidence,
        suggestedAction: detection.suggestedAction,
        severity: detection.severity,
        ruleLabel: detection.ruleLabel,
        actionId: action.id,
      }

      if (detection.severity === "high") high.push(entry)
      else if (detection.severity === "medium") medium.push(entry)
      else low.push(entry)
    }
  }

  // ── Notify Admin ───────────────────────────────────────────────────────────

  const admin = await getBoardAdmin(boardId)

  if (admin) {
    for (const hit of high) {
      const board = await prisma.board.findUnique({ where: { id: boardId }, select: { name: true } })
      const lead = await prisma.lead.findUnique({ where: { id: hit.leadId }, select: { name: true, phone: true } })
      const boardName = board?.name ?? "Unbekannt"
      const leadName = lead?.name || lead?.phone || hit.leadId

      await sendAdminNotification(admin.userId, {
        title: `${hit.ruleLabel} — ${boardName}`,
        message: `Lead: ${leadName}\nAktion: ${hit.suggestedAction}\n\n${JSON.stringify(hit.evidence, null, 2)}`,
        level: "ERROR",
        boardId,
        leadId: hit.leadId,
        supervisorActionId: hit.actionId,
        approvalButtons: true,
        metadata: {
          urgency: "HIGH",
          proposedAction: hit.suggestedAction,
          triggerType: "PERIODIC_AUDIT_FINDING",
          actionParams: hit.evidence,
        },
      })

      await enqueueJob({
        type: "supervisor_execute",
        payload: { supervisorActionId: hit.actionId },
        boardId,
        leadId: hit.leadId,
        scheduledFor: new Date(Date.now() + 86400000), // auto-execute after 24h if no response
      })
    }
  }

  // Medium: batch hourly — check if batch was sent in last hour
  if (medium.length > 0 && admin) {
    const recentBatch = await prisma.adminNotification.findFirst({
      where: {
        boardId,
        recipientId: admin.userId,
        title: { contains: "Supervisor Batch" },
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    })
    if (!recentBatch) {
      const lines = medium.map((h) => `• ${h.ruleLabel} — ${h.suggestedAction} (${h.leadId.slice(0, 8)}…)`)
      await sendAdminNotification(admin.userId, {
        title: `Supervisor Batch — ${medium.length} Medium Findings`,
        message: lines.join("\n"),
        level: "WARNING",
        boardId,
      })
    }
  }

  // Low: daily digest — check if digest was sent today
  if (low.length > 0 && admin) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayDigest = await prisma.adminNotification.findFirst({
      where: {
        boardId,
        recipientId: admin.userId,
        title: { contains: "Daily Digest" },
        createdAt: { gte: todayStart },
      },
    })
    if (!todayDigest) {
      const lines = low.map((h) => `• ${h.ruleLabel} — ${h.leadId.slice(0, 8)}…`)
      await sendAdminNotification(admin.userId, {
        title: `Supervisor Daily Digest — ${low.length} Low Findings`,
        message: lines.join("\n"),
        level: "INFO",
        boardId,
      })
    }
  }

  return { boardId, highCount: high.length, mediumCount: medium.length, lowCount: low.length }
}

export async function runSupervisorScan(targetBoardId?: string): Promise<{ total: number; boards: ScanResult[] }> {
  const boards = await prisma.board.findMany({
    where: {
      ...(targetBoardId ? { id: targetBoardId } : {}),
      isActive: true,
    },
    select: { id: true },
  })

  const results: ScanResult[] = []
  for (const board of boards) {
    const result = await scanBoard(board.id)
    results.push(result)
  }

  const total = results.reduce((sum, r) => sum + r.highCount + r.mediumCount + r.lowCount, 0)
  return { total, boards: results }
}
