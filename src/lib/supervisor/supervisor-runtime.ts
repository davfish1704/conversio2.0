import { prisma } from "@/lib/db"
import { decideSupervisorAction } from "./decision-engine"
import { canAutoApprove } from "./auto-approve"
import { executeAction } from "./executors/index"
import { sendAdminNotification } from "@/lib/admin-notifier/admin-notifier"
import type { SupervisorInput } from "./types"
import type { SupervisorActionType } from "@prisma/client"

export async function runSupervisor(input: SupervisorInput): Promise<void> {
  const { conversationId, boardId, leadId, triggerType, triggerContext } = input

  // ── Gather Context ─────────────────────────────────────────────────────────

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      currentState: { select: { id: true, name: true, autoApproveActions: true } },
      board: {
        select: {
          id: true,
          members: {
            where:  { role: "ADMIN" },
            select: { userId: true },
            take:   1,
          },
        },
      },
    },
  })

  if (!conversation) {
    console.warn(`[Supervisor] Conversation nicht gefunden: ${conversationId}`)
    return
  }

  const recentRuns = await prisma.agentRun.findMany({
    where:   { conversationId },
    orderBy: { createdAt: "desc" },
    take:    10,
    select:  { outcome: true },
  })

  // ── Decide ─────────────────────────────────────────────────────────────────

  const decision = await decideSupervisorAction({
    boardId,
    conversationId,
    triggerType,
    triggerContext,
    recentOutcomes: recentRuns.map((r) => r.outcome),
  })

  // ── Persist Action ─────────────────────────────────────────────────────────

  const action = await prisma.supervisorAction.create({
    data: {
      boardId,
      leadId,
      conversationId,
      triggerType,
      triggerContext:  JSON.parse(JSON.stringify(triggerContext)),
      proposedAction:  decision.proposedAction,
      actionParams:    JSON.parse(JSON.stringify(decision.actionParams)),
      reasoning:       decision.reasoning,
      urgency:         decision.urgency,
      status:          "PENDING_ADMIN",
    },
  })

  // ── Auto-Approve or Notify ─────────────────────────────────────────────────

  const stateAutoApprove = (conversation.currentState?.autoApproveActions ?? []) as SupervisorActionType[]

  if (canAutoApprove(decision.proposedAction, stateAutoApprove)) {
    await prisma.supervisorAction.update({
      where: { id: action.id },
      data:  { status: "AUTO_APPROVED", approvedAt: new Date() },
    })
    await executeAction(action.id)
    return
  }

  // Find primary admin user for this board
  const adminMemberId = conversation.board.members[0]?.userId
  if (!adminMemberId) {
    console.warn(`[Supervisor] Kein Admin-User für Board ${boardId} gefunden`)
    return
  }

  const adminUser = await prisma.user.findUnique({
    where:  { id: adminMemberId },
    select: { id: true, isSuperAdmin: true, adminTelegramChatId: true },
  })

  if (!adminUser?.adminTelegramChatId) {
    console.warn(`[Supervisor] Admin-User ${adminMemberId} hat keinen Telegram-Chat konfiguriert`)
    return
  }

  const messageId = await sendAdminNotification(adminMemberId, {
    title:             `Supervisor: ${decision.proposedAction}`,
    message:           decision.reasoning,
    level:             decision.urgency === "CRITICAL" ? "CRITICAL" : decision.urgency === "HIGH" ? "ERROR" : "WARNING",
    boardId,
    leadId,
    supervisorActionId: action.id,
    approvalButtons:   true,
    metadata: {
      proposedAction: decision.proposedAction,
      actionParams:   decision.actionParams,
      triggerType,
      urgency:        decision.urgency,
    },
  })

  await prisma.supervisorAction.update({
    where: { id: action.id },
    data: {
      notificationSentAt:    new Date(),
      notificationChannel:   "TELEGRAM",
      notificationMessageId: messageId ?? null,
    },
  })
}
