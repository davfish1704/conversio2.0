import { prisma } from "@/lib/db"
import { sendAdminNotification } from "@/lib/admin-notifier/admin-notifier"
import { executeResetState }       from "./reset-state"
import { executeReassignToState }  from "./reassign-to-state"
import { executePauseLead }        from "./pause-lead"
import { executeResumeLead }       from "./resume-lead"
import { executeForceHandoff }     from "./force-handoff"
import { executeKillConversation } from "./kill-conversation"
import { executeUpdateLeadScore }  from "./update-lead-score"
import { executeNotifyOnly }       from "./notify-only"

async function writeExecutionLog(action: { boardId: string; conversationId: string | null; leadId: string | null; proposedAction: string; id: string; actionParams: unknown }, result: "SUCCESS" | "ERROR", detail?: string) {
  try {
    await prisma.executionLog.create({
      data: {
        boardId: action.boardId,
        conversationId: action.conversationId ?? action.leadId ?? "supervisor",
        stateId: null,
        action: `supervisor:${action.proposedAction}`,
        input: JSON.stringify({ actionId: action.id, params: action.actionParams }),
        output: detail ?? result,
        status: result,
        context: { supervisorActionId: action.id, proposedAction: action.proposedAction },
      },
    })
  } catch { /* silent */ }
}

async function notifyFailure(action: { boardId: string; proposedAction: string; id: string }, errorMsg: string) {
  try {
    const board = await prisma.board.findUnique({
      where: { id: action.boardId },
      select: { members: { where: { role: "ADMIN" }, select: { userId: true }, take: 1 } },
    })
    const adminId = board?.members[0]?.userId
    if (!adminId) return
    await sendAdminNotification(adminId, {
      title: `💥 Supervisor Action Failed: ${action.proposedAction}`,
      message: `Action ${action.id} fehlgeschlagen:\n${errorMsg}`,
      level: "ERROR",
      boardId: action.boardId,
    })
  } catch { /* silent */ }
}

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
        await executeEscalateToHuman(action)
        break

      default: {
        const type = action.proposedAction as string
        if (type === "ESCALATE_TO_HUMAN" || type === "RESET_LEAD_STATE" || type === "DISABLE_TOOL" || type === "INCREASE_PROVIDER_BUDGET") {
          if (type === "ESCALATE_TO_HUMAN") await executeEscalateToHuman(action)
          else if (type === "RESET_LEAD_STATE") await executeResetLeadState(action)
          else if (type === "DISABLE_TOOL") await executeDisableTool(action)
          else if (type === "INCREASE_PROVIDER_BUDGET") await executeIncreaseBudget(action)
        } else {
          throw new Error(`Unbekannte proposedAction: ${action.proposedAction}`)
        }
      }
    }

    await writeExecutionLog(action, "SUCCESS")
    await prisma.supervisorAction.update({
      where: { id: supervisorActionId },
      data:  { status: "EXECUTED", executedAt: new Date(), executionResult: { success: true } },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    await writeExecutionLog(action, "ERROR", errorMessage)
    await notifyFailure(action, errorMessage)
    await prisma.supervisorAction.update({
      where: { id: supervisorActionId },
      data:  {
        status:         "FAILED",
        executedAt:     new Date(),
        executionError: errorMessage.slice(0, 500),
      },
    })
  }
}

async function executeEscalateToHuman(action: { boardId: string; leadId: string | null; conversationId: string | null }) {
  const leadId = action.leadId
  if (!leadId) throw new Error("leadId fehlt")

  const humanReviewState = await prisma.state.findFirst({
    where: { boardId: action.boardId, type: "MESSAGE" },
    orderBy: { orderIndex: "asc" },
    select: { id: true },
  })
  if (!humanReviewState) throw new Error("Kein State für Human Review gefunden")

  await prisma.lead.update({
    where: { id: leadId },
    data: { currentStateId: humanReviewState.id },
  })

  if (action.conversationId) {
    await prisma.conversation.update({
      where: { id: action.conversationId },
      data: { frozen: true, frozenReason: "supervisor_escalated", frozenBy: "supervisor" },
    })
  }
}

async function executeResetLeadState(action: { boardId: string; leadId: string | null; conversationId: string | null }) {
  const leadId = action.leadId
  if (!leadId) throw new Error("leadId fehlt")

  const initialState = await prisma.state.findFirst({
    where: { boardId: action.boardId },
    orderBy: { orderIndex: "asc" },
    select: { id: true },
  })
  if (!initialState) throw new Error("Kein initialer State gefunden")

  await prisma.lead.update({
    where: { id: leadId },
    data: { currentStateId: initialState.id },
  })

  if (action.conversationId) {
    await prisma.conversation.update({
      where: { id: action.conversationId },
      data: { currentStateId: initialState.id, frozen: false, frozenReason: null },
    })
  }
}

async function executeDisableTool(action: { boardId: string; actionParams: unknown }) {
  const params = action.actionParams as Record<string, unknown>
  const toolName = params.toolName as string | undefined
  const stateId = params.stateId as string | undefined
  if (!toolName) throw new Error("toolName fehlt")

  if (stateId) {
    const state = await prisma.state.findUnique({
      where: { id: stateId },
      select: { availableTools: true },
    })
    if (!state) throw new Error(`State ${stateId} nicht gefunden`)
    const tools = (state.availableTools as string[]) ?? []
    await prisma.state.update({
      where: { id: stateId },
      data: { availableTools: JSON.parse(JSON.stringify(tools.filter((t) => t !== toolName))) },
    })
  } else {
    const states = await prisma.state.findMany({
      where: { boardId: action.boardId },
      select: { id: true, availableTools: true },
    })
    for (const state of states) {
      const tools = (state.availableTools as string[]) ?? []
      if (tools.includes(toolName)) {
        await prisma.state.update({
          where: { id: state.id },
          data: { availableTools: JSON.parse(JSON.stringify(tools.filter((t) => t !== toolName))) },
        })
      }
    }
  }
}

async function executeIncreaseBudget(_action: { boardId: string; actionParams: unknown }) {
  const params = _action.actionParams as Record<string, unknown>
  const amount = Number(params.amount ?? 5000)
  console.info(`[Executor] Budget increase requested for board ${_action.boardId}: +${amount}c (Board model extension needed)`)
  // Requires `maxDailyCost` field on Board model
}

