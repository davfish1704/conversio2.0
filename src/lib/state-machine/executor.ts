import { prisma } from "@/lib/db"
import { transitionState, getCurrentState } from "@/lib/state-machine"
import { enqueueJob } from "@/lib/jobs/enqueue"
import { sendMessage as dispatchMessage } from "@/lib/messaging/dispatcher"
import { executeSubAgentRun } from "@/lib/agents/sub-agent-runtime"
import { evaluateMissionCompletion } from "./mission-evaluator"

function flowLog(step: string, msg: string, data?: Record<string, unknown>) {
  const extra = data ? ` ${JSON.stringify(data)}` : ""
  console.log(`[FLOW:${step}] ${msg}${extra}`)
}

export interface ExecutionResult {
  skipped?: boolean
  reason?: string
  sent?: boolean
  advanced?: boolean
  newStateId?: string
  error?: string
}

export async function executeStateForConversation(
  conversationId: string,
  userMessage: string,
): Promise<ExecutionResult> {
  flowLog("executor_start", `convId=${conversationId}`, { userMessage: userMessage.slice(0, 80) })

  const conversation = await (prisma as any).conversation.findUnique({
    where: { id: conversationId },
    include: {
      currentState: true,
      board: { include: { brain: true } },
      lead: true,
    },
  })

  if (!conversation) { flowLog("executor_skip", `convId=${conversationId} reason=conversation_not_found`); return { skipped: true, reason: "conversation_not_found" } }
  if (!conversation.board) { flowLog("executor_skip", `convId=${conversationId} reason=board_not_found`); return { skipped: true, reason: "board_not_found" } }
  if (conversation.frozen) { flowLog("executor_skip", `convId=${conversationId} reason=frozen`); return { skipped: true, reason: "conversation_frozen" } }
  if (!conversation.aiEnabled) { flowLog("executor_skip", `convId=${conversationId} reason=ai_disabled`); return { skipped: true, reason: "ai_disabled" } }

  const board = conversation.board
  const state = conversation.currentState ?? (await getCurrentState(conversationId))
  if (!state) { flowLog("executor_skip", `convId=${conversationId} reason=no_current_state`); return { skipped: true, reason: "no_current_state" } }

  flowLog("executor_state_loaded", `convId=${conversationId} stateId=${state.id} stateName="${state.name}" stateType=${state.type}`)

  const isBoardActive =
    board.adminStatus.toString() !== "SUSPENDED" && board.ownerStatus !== "INACTIVE"
  if (!isBoardActive) { flowLog("executor_skip", `convId=${conversationId} reason=board_inactive`); return { skipped: true, reason: "board_inactive" } }

  await maybeScheduleSummarization(
    conversationId,
    conversation.messageCountSinceSum,
    conversation.summaryUpdatedAt,
  )

  const stateData = state as {
    id: string
    name: string
    type: string
    rules: string | null
    config: unknown
    nextStateId: string | null
    dataToCollect: unknown
    completionRule: string | null
    availableTools: unknown
    escalateOnNoReply: number | null
    escalateOnLowConfidence: boolean
    escalateOnOffMission: boolean
    autoTransition: boolean
  }

  flowLog("executor_dispatch", `convId=${conversationId} type=${stateData.type} stateName="${stateData.name}"`)

  switch (stateData.type) {
    case "MESSAGE":
      return executeMessageState(conversationId, stateData, board.id)

    case "WAIT":
      flowLog("executor_skip", `convId=${conversationId} reason=wait_state`)
      return { skipped: true, reason: "wait_state" }

    case "TEMPLATE":
      return executeTemplateState(conversationId, stateData, board.id)

    case "CONDITION": {
      const conditional = await evaluateCondition(
        conversationId,
        stateData,
        userMessage,
      )
      if (conditional.matched && conditional.targetStateId) {
        flowLog("executor_condition_matched", `convId=${conversationId} targetState=${conditional.targetStateId}`)
        await transitionState(conversationId, conditional.targetStateId)
        return { advanced: true, newStateId: conditional.targetStateId }
      }
      if (conditional.matchImpossible) {
        flowLog("executor_condition_match_impossible", `convId=${conversationId}`)
        return { skipped: true, reason: "condition_not_met" }
      }
      flowLog("executor_condition_fallback_ai", `convId=${conversationId}`)
      return executeAIState(conversationId, conversation, stateData, board.id, userMessage)
    }

    case "AI":
    default:
      return executeAIState(conversationId, conversation, stateData, board.id, userMessage)
  }
}

async function executeMessageState(
  conversationId: string,
  state: { id: string; config: unknown },
  boardId: string,
): Promise<ExecutionResult> {
  const msgConfig = state.config as Record<string, string> | null
  const text = msgConfig?.text
  if (!text) return { skipped: true, reason: "no_message_text" }

  await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      content: text,
      messageType: "TEXT",
      status: "SENT",
      aiGenerated: false,
    },
  })
  await dispatchMessage(conversationId, text)
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })
  return { sent: true }
}

async function executeTemplateState(
  conversationId: string,
  state: { id: string; config: unknown },
  boardId: string,
): Promise<ExecutionResult> {
  const msgConfig = state.config as Record<string, string> | null
  const text = msgConfig?.text
  if (!text) return { skipped: true, reason: "no_template_text" }

  await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      content: text,
      messageType: "TEMPLATE",
      status: "SENT",
      aiGenerated: false,
    },
  })
  await dispatchMessage(conversationId, text)
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })

  if (state.config) {
    const config = state.config as Record<string, unknown>
    if (config.nextStateId && config.autoTransition) {
      await transitionState(conversationId, config.nextStateId as string)
      return { sent: true, advanced: true, newStateId: config.nextStateId as string }
    }
  }

  return { sent: true }
}

async function evaluateCondition(
  conversationId: string,
  state: { id: string; name: string; rules: string | null; nextStateId: string | null },
  userMessage: string,
): Promise<{ matched: boolean; targetStateId: string | null; matchImpossible: boolean }> {
  if (!state.nextStateId) {
    return { matched: false, targetStateId: null, matchImpossible: true }
  }

  const lowerMsg = userMessage.toLowerCase()
  const positiveKeywords = [
    "ja", "yes", "ok", "klar", "gerne", "passt", "perfekt",
    "interessiert", "weiter", "sure", "agree", "correct",
  ]

  if (positiveKeywords.some((kw) => lowerMsg.includes(kw))) {
    return { matched: true, targetStateId: state.nextStateId, matchImpossible: false }
  }

  const negativeKeywords = ["nein", "no", "nicht", "kein", "stop", "aufhören", "never", "dont", "don't"]
  if (negativeKeywords.some((kw) => lowerMsg.includes(kw))) {
    return { matched: false, targetStateId: null, matchImpossible: true }
  }

  if (state.rules) {
    const match = state.rules.match(
      /(\w+)\s*(>|<|=|contains|equals)\s*["']?([^"'\n]+)["']?/i,
    )
    if (match) {
      const operator = match[2].toLowerCase()
      const value = match[3].trim().toLowerCase()
      switch (operator) {
        case "contains":
          return {
            matched: lowerMsg.includes(value),
            targetStateId: state.nextStateId,
            matchImpossible: false,
          }
        case "equals":
        case "=":
          return {
            matched: lowerMsg === value,
            targetStateId: state.nextStateId,
            matchImpossible: false,
          }
      }
    }
  }

  return { matched: false, targetStateId: state.nextStateId, matchImpossible: false }
}

async function executeAIState(
  conversationId: string,
  conversation: {
    id: string
    boardId: string | null
    channel: string
    customData: unknown
    currentStateId: string | null
    followupCount: number
    conversationSummary: string | null
    lead?: { customData: Record<string, unknown> } | null
    board?: { brain?: { language: string } | null } | null
  },
  state: {
    id: string
    name: string
    rules: string | null
    type: string
    nextStateId: string | null
    dataToCollect: unknown
    completionRule: string | null
    availableTools: unknown
    agentGoal?: string | null
    escalateOnNoReply: number | null
    escalateOnLowConfidence: boolean
    escalateOnOffMission: boolean
  },
  boardId: string,
  overrideUserMessage?: string,
): Promise<ExecutionResult> {
  const userMessage = overrideUserMessage ?? ""

  flowLog("execute_ai_state", `convId=${conversationId} stateName="${state.name}" stateId=${state.id} nextStateId=${state.nextStateId ?? "none"} hasAgentGoal=${!!state.agentGoal}`)

  const result = await executeSubAgentRun({ conversationId, boardId, userMessage })

  flowLog("ai_result", `convId=${conversationId} action=${result.action} hasResponse=${!!result.responseText} responseLen=${result.responseText?.length ?? 0} outcome=${result.outcome} transitioned=${result.targetStateId ?? "none"} handoff=${result.handoffProposed} confidence=${result.agentConfidence}`)

  if (state.escalateOnNoReply && result.responseText) {
    const delayMs = state.escalateOnNoReply * 60 * 60 * 1000
    await enqueueJob({
      type: "escalation_check",
      payload: { conversationId },
      leadId: conversationId,
      boardId,
      scheduledFor: new Date(Date.now() + delayMs),
    }).catch((e: unknown) => console.error("[executor] Escalation check enqueue failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))
  }

  if (result.action === "transition" && result.targetStateId) {
    flowLog("ai_action_transition", `convId=${conversationId} targetState=${result.targetStateId}`)
    return { sent: !!result.responseText, advanced: true, newStateId: result.targetStateId }
  }

  if (result.action === "escalate") {
    flowLog("ai_action_escalate", `convId=${conversationId}`)
    return { sent: false, reason: "escalated" }
  }

  // ── Auto Mission Evaluation ──────────────────────────────────────────────
  flowLog("mission_check", `convId=${conversationId} hasGoal=${!!state.agentGoal} hasNextState=${!!state.nextStateId} action=${result.action} hasResponse=${!!result.responseText} rawMarker=${result.rawMissionCompleted}`)
  if (
    state.agentGoal &&
    state.nextStateId &&
    result.action === "respond" &&
    result.responseText
  ) {
    // Check the pre-sanitized marker from the raw LLM output
    if (result.rawMissionCompleted) {
      flowLog("mission_marker_completed", `convId=${conversationId} transitioning to ${state.nextStateId}`)
      await transitionState(conversationId, state.nextStateId, "ai_advance")
      return { sent: true, advanced: true, newStateId: state.nextStateId }
    }

    // No marker found → fall back to LLM evaluator (async, non-blocking)
    flowLog("mission_fallback_start", `convId=${conversationId} goal="${(state.agentGoal ?? "").slice(0, 60)}"`)
    const language = conversation.board?.brain?.language ?? "de"
    const leadData = (conversation.lead?.customData as Record<string, unknown>) ?? {}
    const summary = conversation.conversationSummary ?? null
    const goal = state.agentGoal
    const sName = state.name
    const nxtStateId = state.nextStateId
    const convId = conversationId

    prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { timestamp: "desc" },
      take: 8,
      select: { direction: true, content: true },
    }).then((recentMessages) => {
      recentMessages.reverse()
      flowLog("mission_fallback_eval", `convId=${convId} msgCount=${recentMessages.length}`)
      return evaluateMissionCompletion({
        agentGoal: goal,
        stateName: sName,
        recentMessages,
        leadData,
        conversationSummary: summary,
        language,
        boardId,
      })
    }).then((evalResult) => {
      flowLog("mission_fallback_result", `convId=${convId} completed=${evalResult.completed} confidence=${evalResult.confidence} reason="${evalResult.reason}"`)
      if (evalResult.completed && evalResult.confidence >= 0.5) {
        flowLog("mission_fallback_transition", `convId=${convId} transitioning to ${nxtStateId}`)
        transitionState(convId, nxtStateId!, "ai_advance").catch((e: unknown) =>
          console.error("[Executor] Fallback transition failed:", e),
        )
      }
    }).catch((e: unknown) =>
      console.error("[Executor] Fallback mission eval failed:", e),
    )
  }

  flowLog("executor_return", `convId=${conversationId} sent=${!!result.responseText}`)
  return { sent: !!result.responseText }
}

async function maybeScheduleSummarization(
  conversationId: string,
  messageCountSinceSum: number,
  summaryUpdatedAt: Date | null,
): Promise<void> {
  await prisma.conversation
    .update({
      where: { id: conversationId },
      data: { messageCountSinceSum: { increment: 1 } },
    })
    .catch((e: unknown) => console.error("[executor] Message count increment failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))

  const newCount = messageCountSinceSum + 1
  const hoursSinceSummary = summaryUpdatedAt
    ? (Date.now() - summaryUpdatedAt.getTime()) / 3_600_000
    : Infinity

  if (newCount >= 50 || hoursSinceSummary >= 24) {
    await enqueueJob({
      type: "summarize_conversation",
      payload: { conversationId },
      leadId: conversationId,
      scheduledFor: new Date(),
      maxAttempts: 2,
    }).catch((e: unknown) => console.error("[executor] Summarization job enqueue failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))
    await prisma.conversation
      .update({
        where: { id: conversationId },
        data: { messageCountSinceSum: 0 },
      })
      .catch((e: unknown) => console.error("[executor] Message count reset failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))
  }
}
