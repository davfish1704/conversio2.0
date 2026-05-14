/**
 * Production Diagnostics — READ ONLY, keine Änderungen.
 * Verwendet DATABASE_URL aus .env (= Neon Production).
 *
 * Ausführen: npx tsx scripts/diagnose-production.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function sep(title: string) {
  console.log(`\n${"═".repeat(60)}`)
  console.log(`  ${title}`)
  console.log("═".repeat(60))
}

function row(label: string, value: unknown) {
  console.log(`  ${label.padEnd(36)} ${String(value)}`)
}

async function main() {
  console.log("\n🔍 Conversio Production Diagnostics\n")
  console.log(`  DB: ${process.env.DATABASE_URL?.split("@")[1]?.split("/")[0] ?? "unknown"}`)
  console.log(`  Zeitpunkt: ${new Date().toISOString()}`)

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // ── 1: Leads ────────────────────────────────────────────────────────────────
  sep("1. LEADS (letzte 24h)")

  const leadCount = await prisma.lead.count({ where: { createdAt: { gte: since24h } } })
  const totalLeads = await prisma.lead.count()
  row("Neue Leads (24h):", leadCount)
  row("Gesamt Leads:", totalLeads)

  // ── 2: Messages ─────────────────────────────────────────────────────────────
  sep("2. MESSAGES (letzte 24h)")

  const inbound  = await prisma.message.count({ where: { timestamp: { gte: since24h }, direction: "INBOUND" } })
  const outbound = await prisma.message.count({ where: { timestamp: { gte: since24h }, direction: "OUTBOUND" } })
  const aiOut    = await prisma.message.count({ where: { timestamp: { gte: since24h }, direction: "OUTBOUND", aiGenerated: true } })
  row("INBOUND:", inbound)
  row("OUTBOUND gesamt:", outbound)
  row("OUTBOUND (AI-generiert):", aiOut)
  if (inbound > 0 && aiOut === 0) {
    console.log("\n  ⚠️  INBOUND vorhanden aber KEIN AI-Output — AI antwortet nicht!")
  }

  // ── 3: Jobs ─────────────────────────────────────────────────────────────────
  sep("3. JOBS (alle Status)")

  const jobStatuses = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "DEAD", "CANCELLED"] as const
  for (const status of jobStatuses) {
    const count = await prisma.job.count({ where: { status } })
    row(`${status}:`, count)
  }

  const pendingOld = await prisma.job.count({
    where: { status: "PENDING", scheduledFor: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
  })
  if (pendingOld > 0) {
    console.log(`\n  ⚠️  ${pendingOld} Jobs sind seit >5min PENDING — Cron läuft möglicherweise nicht!`)
  }

  // ── 4: AgentRuns ────────────────────────────────────────────────────────────
  sep("4. AGENT RUNS (letzte 24h)")

  const outcomes = [
    "SUCCESS_CONTINUE",
    "SUCCESS_HANDOFF",
    "HANDOFF_BLOCKED",
    "TOOL_EXECUTION_FAILED",
    "LLM_ERROR",
    "ESCALATED",
  ] as const

  const totalRuns = await prisma.agentRun.count({ where: { createdAt: { gte: since24h } } })
  row("Gesamt AgentRuns:", totalRuns)
  for (const outcome of outcomes) {
    const count = await prisma.agentRun.count({ where: { createdAt: { gte: since24h }, outcome } })
    if (count > 0) row(`  ${outcome}:`, count)
  }

  // ── 5: Letzte 5 fehlgeschlagene Jobs ────────────────────────────────────────
  sep("5. LETZTE 5 FEHLGESCHLAGENE JOBS")

  const failedJobs = await prisma.job.findMany({
    where:   { status: { in: ["FAILED", "DEAD"] } },
    orderBy: { createdAt: "desc" },
    take:    5,
    select:  { id: true, type: true, status: true, attempts: true, lastError: true, createdAt: true },
  })

  if (failedJobs.length === 0) {
    console.log("  (keine fehlgeschlagenen Jobs)")
  } else {
    for (const j of failedJobs) {
      console.log(`\n  Job: ${j.id}`)
      console.log(`    Type:     ${j.type}`)
      console.log(`    Status:   ${j.status}  (${j.attempts} Versuche)`)
      console.log(`    Erstellt: ${j.createdAt.toISOString()}`)
      console.log(`    Fehler:   ${j.lastError ?? "—"}`)
    }
  }

  // ── 6: Letzte 5 fehlerhafte AgentRuns ───────────────────────────────────────
  sep("6. LETZTE 5 FEHLERHAFTE AGENT RUNS")

  const failedRuns = await prisma.agentRun.findMany({
    where:   { outcome: { in: ["LLM_ERROR", "TOOL_EXECUTION_FAILED"] } },
    orderBy: { createdAt: "desc" },
    take:    5,
    select:  { id: true, outcome: true, model: true, provider: true, errorMessage: true, createdAt: true, boardId: true },
  })

  if (failedRuns.length === 0) {
    console.log("  (keine fehlerhaften AgentRuns)")
  } else {
    for (const r of failedRuns) {
      console.log(`\n  AgentRun: ${r.id}`)
      console.log(`    Outcome:  ${r.outcome}`)
      console.log(`    Model:    ${r.model} / ${r.provider}`)
      console.log(`    Board:    ${r.boardId}`)
      console.log(`    Erstellt: ${r.createdAt.toISOString()}`)
      console.log(`    Fehler:   ${r.errorMessage ?? "—"}`)
    }
  }

  // ── 7: Boards — Hat das aktive Board States + SystemPrompt? ─────────────────
  sep("7. BOARDS — KONFIGURATIONSCHECK")

  const boards = await prisma.board.findMany({
    where:   { isActive: true },
    select: {
      id:          true,
      name:        true,
      adminStatus: true,
      ownerStatus: true,
      _count: {
        select: { states: true, conversations: true, leads: true },
      },
      brain: {
        select: {
          systemPrompt: true,
          defaultModel: true,
        },
      },
      states: {
        where:  { isActive: true, type: "AI" },
        select: { id: true, name: true, type: true, agentRole: true, agentGoal: true },
        take:   5,
      },
      aiProviderConfig: {
        select: { defaultProvider: true, defaultModel: true },
      },
    },
    take: 5,
  })

  if (boards.length === 0) {
    console.log("  ⚠️  Keine aktiven Boards gefunden!")
  }

  for (const b of boards) {
    console.log(`\n  Board: "${b.name}" (${b.id})`)
    console.log(`    Status:       admin=${b.adminStatus} owner=${b.ownerStatus}`)
    console.log(`    States:       ${b._count.states} gesamt, ${b.states.length} aktive AI-States angezeigt`)
    console.log(`    Conversations:${b._count.conversations}`)
    console.log(`    Leads:        ${b._count.leads}`)
    console.log(`    SystemPrompt: ${b.brain?.systemPrompt ? `✅ (${b.brain.systemPrompt.slice(0, 60)}...)` : "❌ NICHT GESETZT"}`)
    console.log(`    Brain Model:  ${b.brain?.defaultModel ?? "—"}`)
    console.log(`    AIProvider:   ${b.aiProviderConfig?.defaultProvider ?? "—"} / ${b.aiProviderConfig?.defaultModel ?? "—"}`)

    if (b.states.length === 0) {
      console.log(`    AI-States:    ⚠️  Keine aktiven AI-States!`)
    } else {
      for (const s of b.states) {
        const hasRole = !!s.agentRole
        const hasGoal = !!s.agentGoal
        console.log(`    AI-State:     "${s.name}" — agentRole:${hasRole ? "✅" : "❌"} agentGoal:${hasGoal ? "✅" : "❌"}`)
      }
    }
  }

  // ── 8: Pending Jobs Detail ───────────────────────────────────────────────────
  sep("8. ÄLTESTE PENDING JOBS (max 5)")

  const pendingJobs = await prisma.job.findMany({
    where:   { status: "PENDING" },
    orderBy: { scheduledFor: "asc" },
    take:    5,
    select:  { id: true, type: true, scheduledFor: true, attempts: true, payload: true },
  })

  if (pendingJobs.length === 0) {
    console.log("  (keine pending Jobs — Queue ist leer)")
  } else {
    for (const j of pendingJobs) {
      const ageMin = Math.round((Date.now() - j.scheduledFor.getTime()) / 60000)
      console.log(`\n  Job: ${j.id}`)
      console.log(`    Type:        ${j.type}`)
      console.log(`    Scheduled:   ${j.scheduledFor.toISOString()} (${ageMin}min alt)`)
      console.log(`    Attempts:    ${j.attempts}`)
      const payload = j.payload as Record<string, unknown>
      console.log(`    Payload:     conversationId=${payload.conversationId ?? "—"}`)
    }
  }

  // ── 9: AI Provider Keys vorhanden? ──────────────────────────────────────────
  sep("9. PLATFORM API KEYS (Vorhanden?)")

  const keys = await prisma.platformAPIKey.findMany({
    select: { provider: true, isActive: true, monthlyBudgetCents: true },
  })

  if (keys.length === 0) {
    console.log("  ⚠️  Keine PlatformAPIKeys in DB — AI-Calls nutzen ENV-Keys direkt")
  } else {
    for (const k of keys) {
      row(`  ${k.provider}:`, `active=${k.isActive} budget=${k.monthlyBudgetCents ?? "unlimited"}`)
    }
  }

  console.log("\n" + "═".repeat(60))
  console.log("  Diagnose abgeschlossen.")
  console.log("═".repeat(60) + "\n")
}

main()
  .catch((err) => {
    console.error("\n❌ Diagnose-Fehler:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
