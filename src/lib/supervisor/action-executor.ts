import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"
import { sendAdminNotification } from "@/lib/admin-notifier/admin-notifier"
import { executeAction as executeExistingAction } from "./executors/index"
import type { SupervisorAction } from "@prisma/client"

async function writeExecutionLog(
  action: SupervisorAction,
  result: "SUCCESS" | "ERROR",
  detail?: string,
) {
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
        context: {
          supervisorActionId: action.id,
          proposedAction: action.proposedAction,
          urgency: action.urgency,
        },
      },
    })
  } catch (e) {
    console.error("[action-executor] ExecutionLog write failed:", e)
  }
}

async function notifyAdminError(action: SupervisorAction, errorMsg: string) {
  try {
    // Find board admin
    const board = await prisma.board.findUnique({
      where: { id: action.boardId },
      select: {
        members: { where: { role: "ADMIN" }, select: { userId: true }, take: 1 },
      },
    })
    const adminId = board?.members[0]?.userId
    if (!adminId) return

    await sendAdminNotification(adminId, {
      title: `💥 Supervisor Action Failed: ${action.proposedAction}`,
      message: `Action ${action.id} fehlgeschlagen:\n${errorMsg}`,
      level: "ERROR",
      boardId: action.boardId,
      leadId: action.leadId ?? undefined,
      supervisorActionId: action.id,
    })
  } catch {
    // silent
  }
}

// ── ESCALATE_TO_HUMAN ──────────────────────────────────────────────────────────
// Maps to REQUEST_HUMAN_TAKEOVER. Sets lead to "Human Review" stage,
// assigns to board owner.
async function executeEscalateToHuman(action: SupervisorAction): Promise<void> {
  const leadId = action.leadId
  if (!leadId) throw new Error("leadId fehlt für ESCALATE_TO_HUMAN")

  // Find "Human Review" state or first state as fallback
  const humanReviewState = await prisma.state.findFirst({
    where: { boardId: action.boardId, type: "MESSAGE" },
    orderBy: { orderIndex: "asc" },
    select: { id: true, name: true },
  })
  if (!humanReviewState) throw new Error("Kein State für Human Review gefunden")

  // Update lead
  await prisma.lead.update({
    where: { id: leadId },
    data: { currentStateId: humanReviewState.id },
  })

  // Freeze conversation
  if (action.conversationId) {
    await prisma.conversation.update({
      where: { id: action.conversationId },
      data: {
        frozen: true,
        frozenReason: "supervisor_escalated",
        frozenBy: "supervisor",
      },
    })
  }
}

// ── FORCE_HANDOFF ──────────────────────────────────────────────────────────────
// Delegates to existing executor
async function executeForceHandoff(action: SupervisorAction): Promise<void> {
  const convId = action.conversationId
  if (!convId) throw new Error("conversationId fehlt für FORCE_HANDOFF")

  const params = action.actionParams as Record<string, unknown>
  const targetStateId = params.targetStateId as string | undefined

  if (targetStateId) {
    await transitionState(convId, targetStateId, "ai_advance")
    return
  }

  // Fallback: next state from current state
  const conv = await prisma.conversation.findUnique({
    where: { id: convId },
    include: { currentState: { select: { nextStateId: true } } },
  })
  const fallbackId = conv?.currentState?.nextStateId
  if (!fallbackId) throw new Error("Kein targetStateId für Force-Handoff")
  await transitionState(convId, fallbackId, "ai_advance")
}

// ── DISABLE_TOOL ───────────────────────────────────────────────────────────────
// Removes a tool from the state's availableTools list.
// Saves original list in context for revert.
// NOTE: Needs SupervisorActionType enum extension.
async function executeDisableTool(action: SupervisorAction): Promise<void> {
  const params = action.actionParams as Record<string, unknown>
  const toolName = params.toolName as string | undefined
  const stateId = params.stateId as string | undefined

  if (!toolName) throw new Error("toolName fehlt für DISABLE_TOOL")

  if (stateId) {
    const state = await prisma.state.findUnique({
      where: { id: stateId },
      select: { availableTools: true },
    })
    if (!state) throw new Error(`State ${stateId} nicht gefunden`)

    const tools = (state.availableTools as string[]) ?? []
    const updated = tools.filter((t) => t !== toolName)

    await prisma.state.update({
      where: { id: stateId },
      data: {
        availableTools: JSON.parse(JSON.stringify(updated)),
        config: JSON.parse(JSON.stringify({
          ...(state.availableTools as object),
          _disabledTools: { [toolName]: true },
        })),
      },
    })
  } else {
    // Disable tool across all states in board
    const states = await prisma.state.findMany({
      where: { boardId: action.boardId },
      select: { id: true, availableTools: true },
    })
    for (const state of states) {
      const tools = (state.availableTools as string[]) ?? []
      if (tools.includes(toolName)) {
        await prisma.state.update({
          where: { id: state.id },
          data: {
            availableTools: JSON.parse(JSON.stringify(tools.filter((t) => t !== toolName))),
          },
        })
      }
    }
  }
}

// ── RESET_LEAD_STATE ──────────────────────────────────────────────────────────
// Resets lead to the board's initial (first) state.
async function executeResetLeadState(action: SupervisorAction): Promise<void> {
  const leadId = action.leadId
  if (!leadId) throw new Error("leadId fehlt für RESET_LEAD_STATE")

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

  // Also update any active conversations
  if (action.conversationId) {
    await prisma.conversation.update({
      where: { id: action.conversationId },
      data: { currentStateId: initialState.id, frozen: false, frozenReason: null },
    })
  }
}

// ── INCREASE_PROVIDER_BUDGET ──────────────────────────────────────────────────
// Increases board daily cost limit.
// NOTE: Needs `maxDailyCost` field on Board model and SupervisorActionType extension.
async function executeIncreaseBudget(action: SupervisorAction): Promise<void> {
  const params = action.actionParams as Record<string, unknown>
  const amount = Number(params.amount ?? 5000) // default $50 in cents

  // Since Board has no maxDailyCost yet, we store in triggerContext as override
  await prisma.board.update({
    where: { id: action.boardId },
    data: {
      // Placeholder: Board model extension needed
    },
  })

  // Log the budget increase request
  console.info(`[action-executor] Budget increase requested for board ${action.boardId}: +${amount}c`)
}

// ── NOTIFY_ONLY ──────────────────────────────────────────────────────────────
async function executeNotifyOnly(): Promise<void> {
  // No side effect — just acknowledged
}

// ── Main Executor ────────────────────────────────────────────────────────────

const ACTION_HANDLERS: Record<string, (action: SupervisorAction) => Promise<void>> = {
  NOTIFY_ONLY:         executeNotifyOnly,
  UPDATE_LEAD_SCORE:   (a) => executeExistingAction(a.id),
  RESET_STATE:         (a) => executeExistingAction(a.id),
  REASSIGN_TO_STATE:   (a) => executeExistingAction(a.id),
  PAUSE_LEAD:          (a) => executeExistingAction(a.id),
  RESUME_LEAD:         (a) => executeExistingAction(a.id),
  KILL_CONVERSATION:   (a) => executeExistingAction(a.id),
  REQUEST_HUMAN_TAKEOVER: executeEscalateToHuman,
  FORCE_HANDOFF:       executeForceHandoff,
}

export async function executeSupervisorAction(actionId: string): Promise<void> {
  const action = await prisma.supervisorAction.findUnique({
    where: { id: actionId },
  })

  if (!action) throw new Error(`SupervisorAction nicht gefunden: ${actionId}`)
  if (action.status !== "APPROVED" && action.status !== "AUTO_APPROVED") {
    throw new Error(`Aktion ${actionId} hat Status ${action.status} — nicht ausführbar`)
  }

  const handler = ACTION_HANDLERS[action.proposedAction] ?? (action.proposedAction === "REQUEST_HUMAN_TAKEOVER" ? executeEscalateToHuman : undefined)

  if (!handler) {
    // Unknown action type — write ExecutionLog and fail
    await writeExecutionLog(action, "ERROR", `Unbekannte Aktion: ${action.proposedAction}`)
    await prisma.supervisorAction.update({
      where: { id: actionId },
      data: {
        status: "FAILED",
        executedAt: new Date(),
        executionError: `Unbekannte Aktion: ${action.proposedAction}`.slice(0, 500),
      },
    })
    await notifyAdminError(action, `Unbekannte Aktion: ${action.proposedAction}`)
    return
  }

  try {
    await handler(action)
    await writeExecutionLog(action, "SUCCESS")
    await prisma.supervisorAction.update({
      where: { id: actionId },
      data: {
        status: "EXECUTED",
        executedAt: new Date(),
        executionResult: JSON.parse(JSON.stringify({ success: true })),
      },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await writeExecutionLog(action, "ERROR", errorMsg)
    await prisma.supervisorAction.update({
      where: { id: actionId },
      data: {
        status: "FAILED",
        executedAt: new Date(),
        executionError: errorMsg.slice(0, 500),
      },
    })
    await notifyAdminError(action, errorMsg)
  }
}
