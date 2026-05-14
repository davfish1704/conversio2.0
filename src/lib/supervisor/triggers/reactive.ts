import { prisma } from "@/lib/db"
import { runSupervisor } from "../supervisor-runtime"

interface AgentRunRef {
  id:             string
  conversationId: string
  boardId:        string
  leadId:         string
  stateId:        string
  outcome:        string
}

export async function checkReactiveTriggers(agentRun: AgentRunRef): Promise<void> {
  const { conversationId, boardId, leadId, stateId, outcome } = agentRun

  // ── ESCALATION_REQUESTED ───────────────────────────────────────────────────
  if (outcome === "ESCALATED") {
    await runSupervisor({
      conversationId,
      boardId,
      leadId,
      triggerType:    "ESCALATION_REQUESTED",
      triggerContext: { agentRunId: agentRun.id, stateId },
    })
    return
  }

  // ── AGENT_STUCK: letzte 3 Runs alle LLM_ERROR oder TOOL_EXECUTION_FAILED ──
  if (outcome === "LLM_ERROR" || outcome === "TOOL_EXECUTION_FAILED") {
    const recent = await prisma.agentRun.findMany({
      where:   { conversationId },
      orderBy: { createdAt: "desc" },
      take:    3,
      select:  { outcome: true },
    })

    const STUCK_OUTCOMES = ["LLM_ERROR", "TOOL_EXECUTION_FAILED"]
    if (recent.length === 3 && recent.every((r) => STUCK_OUTCOMES.includes(r.outcome))) {
      await runSupervisor({
        conversationId,
        boardId,
        leadId,
        triggerType:    "AGENT_STUCK",
        triggerContext: { recentOutcomes: recent.map((r) => r.outcome), stateId },
      })
      return
    }
  }

  // ── HANDOFF_REPEATEDLY_BLOCKED: ≥3 HANDOFF_BLOCKED in dieser (conv, state) ─
  if (outcome === "HANDOFF_BLOCKED") {
    const blockedCount = await prisma.agentRun.count({
      where: { conversationId, stateId, outcome: "HANDOFF_BLOCKED" },
    })

    if (blockedCount >= 3) {
      await runSupervisor({
        conversationId,
        boardId,
        leadId,
        triggerType:    "HANDOFF_REPEATEDLY_BLOCKED",
        triggerContext: { blockedCount, stateId },
      })
    }
  }
}
