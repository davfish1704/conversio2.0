import { prisma } from "@/lib/db"
import { runSupervisor } from "../supervisor-runtime"

export async function runPeriodicAudit(targetBoardId?: string): Promise<number> {
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000) // letzte 4 Stunden

  // Boards mit aktiven Conversations ermitteln
  const boards = await prisma.board.findMany({
    where: {
      ...(targetBoardId ? { id: targetBoardId } : {}),
      isActive: true,
      conversations: { some: { status: "ACTIVE", lastMessageAt: { gte: since } } },
    },
    select: { id: true },
  })

  let triggered = 0

  for (const board of boards) {
    const boardId = board.id

    // AgentRun-Statistiken für dieses Board
    const [failCount, blockedCount, escalatedCount] = await Promise.all([
      prisma.agentRun.count({
        where: { boardId, createdAt: { gte: since }, outcome: { in: ["LLM_ERROR", "TOOL_EXECUTION_FAILED"] } },
      }),
      prisma.agentRun.count({
        where: { boardId, createdAt: { gte: since }, outcome: "HANDOFF_BLOCKED" },
      }),
      prisma.agentRun.count({
        where: { boardId, createdAt: { gte: since }, outcome: "ESCALATED" },
      }),
    ])

    // Kein Problem → kein Trigger
    if (failCount === 0 && blockedCount === 0 && escalatedCount === 0) continue

    // Repräsentative Conversation für Kontext
    const conversation = await prisma.conversation.findFirst({
      where:   { boardId, status: "ACTIVE" },
      select:  { id: true, leadId: true },
      orderBy: { lastMessageAt: "desc" },
    })

    if (!conversation) continue

    await runSupervisor({
      conversationId: conversation.id,
      boardId,
      leadId:         conversation.leadId,
      triggerType:    "PERIODIC_AUDIT_FINDING",
      triggerContext: {
        period:         "4h",
        failCount,
        blockedCount,
        escalatedCount,
      },
    })

    triggered++
  }

  return triggered
}
