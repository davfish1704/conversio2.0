import { prisma } from "@/lib/db"
import { executeResetState }       from "./reset-state"
import { executeReassignToState }  from "./reassign-to-state"
import { executePauseLead }        from "./pause-lead"
import { executeResumeLead }       from "./resume-lead"
import { executeForceHandoff }     from "./force-handoff"
import { executeKillConversation } from "./kill-conversation"
import { executeUpdateLeadScore }  from "./update-lead-score"
import { executeNotifyOnly }       from "./notify-only"

export async function executeAction(supervisorActionId: string): Promise<void> {
  const action = await prisma.supervisorAction.findUnique({
    where: { id: supervisorActionId },
  })

  if (!action) throw new Error(`SupervisorAction nicht gefunden: ${supervisorActionId}`)

  if (action.status !== "APPROVED" && action.status !== "AUTO_APPROVED") {
    throw new Error(`Aktion ${supervisorActionId} hat Status ${action.status} — nicht ausführbar`)
  }

  const params = action.actionParams as Record<string, unknown>

  try {
    switch (action.proposedAction) {
      case "NOTIFY_ONLY":
        await executeNotifyOnly()
        break

      case "RESET_STATE":
        if (!action.conversationId) throw new Error("conversationId fehlt")
        await executeResetState(action.conversationId)
        break

      case "REASSIGN_TO_STATE":
        if (!action.conversationId) throw new Error("conversationId fehlt")
        await executeReassignToState(action.conversationId, params)
        break

      case "PAUSE_LEAD":
        if (!action.leadId) throw new Error("leadId fehlt")
        await executePauseLead(action.leadId)
        break

      case "RESUME_LEAD":
        if (!action.leadId) throw new Error("leadId fehlt")
        await executeResumeLead(action.leadId)
        break

      case "FORCE_HANDOFF":
        if (!action.conversationId) throw new Error("conversationId fehlt")
        await executeForceHandoff(action.conversationId, params)
        break

      case "KILL_CONVERSATION":
        if (!action.conversationId) throw new Error("conversationId fehlt")
        await executeKillConversation(action.conversationId)
        break

      case "UPDATE_LEAD_SCORE":
        if (!action.leadId) throw new Error("leadId fehlt")
        await executeUpdateLeadScore(action.leadId, params)
        break

      case "REQUEST_HUMAN_TAKEOVER":
        // Wie NOTIFY_ONLY — der Admin-Notification-Flow hat bereits stattgefunden
        await executeNotifyOnly()
        break

      default:
        throw new Error(`Unbekannte proposedAction: ${action.proposedAction}`)
    }

    await prisma.supervisorAction.update({
      where: { id: supervisorActionId },
      data:  { status: "EXECUTED", executedAt: new Date(), executionResult: { success: true } },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await prisma.supervisorAction.update({
      where: { id: supervisorActionId },
      data:  {
        status:         "FAILED",
        executedAt:     new Date(),
        executionError: errorMessage.slice(0, 500),
      },
    })
    throw err
  }
}
