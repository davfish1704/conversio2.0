import { prisma } from "@/lib/db"

export type StageMoveReason = "manual" | "ai_advance"

/**
 * Einziger autorisierter Pfad für Lead-Stage-Änderungen.
 * Cron-Jobs und Timeouts dürfen diese Funktion NICHT aufrufen.
 *
 * Regeln:
 * - "manual": User-Aktion (Kanban-Drag oder LeadDrawer) — jede Stage erlaubt
 * - "ai_advance": State Machine — nur vorwärts (höherer orderIndex), nie zurück
 */
export async function moveLeadToStage(
  leadId: string,
  newStateId: string,
  reason: StageMoveReason,
  userId?: string
): Promise<void> {
  const lead = await (prisma as any).lead.findUnique({
    where: { id: leadId },
    include: { currentState: true },
  })
  if (!lead) {
    console.warn(`[stage-guard] Lead ${leadId} nicht gefunden — Stage-Move abgebrochen`)
    return
  }

  // Rückwärts-Schutz für AI-Advances
  if (reason === "ai_advance" && lead.currentState) {
    const targetState = await prisma.state.findUnique({ where: { id: newStateId } })
    if (targetState && targetState.orderIndex <= lead.currentState.orderIndex) {
      console.warn(
        `[stage-guard] Blockiert: AI versucht Lead rückwärts zu schieben ` +
        `(lead=${leadId} von orderIndex=${lead.currentState.orderIndex} nach ${targetState.orderIndex}). ` +
        `Lead bleibt in State "${lead.currentState.name}".`
      )
      return
    }
  }

  const historyEntry = {
    fromStateId: lead.currentStateId,
    toStateId: newStateId,
    reason,
    movedBy: userId ?? reason,
    timestamp: new Date().toISOString(),
  }
  const existingHistory: unknown[] = Array.isArray(lead.stateHistory) ? lead.stateHistory : []

  await (prisma as any).lead.update({
    where: { id: leadId },
    data: {
      currentStateId: newStateId,
      stageMovedAt: new Date(),
      stageMovedBy: userId ? `${reason}:${userId}` : reason,
      stateHistory: [...existingHistory, historyEntry],
    },
  })

  console.log(
    `[stage-guard] Lead ${leadId} bewegt: ${lead.currentStateId ?? "null"} → ${newStateId} (${reason}${userId ? `:${userId}` : ""})`
  )
}
