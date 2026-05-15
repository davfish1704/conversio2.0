import { prisma } from "@/lib/db"
import { transitionState, getCurrentState } from "@/lib/state-machine"
import { enqueueJob } from "@/lib/jobs/enqueue"
import { sendMessage as dispatchMessage } from "@/lib/messaging/dispatcher"
import { executeSubAgentRun } from "@/lib/agents/sub-agent-runtime"

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
  const conversation = await (prisma as any).conversation.findUnique({
    where: { id: conversationId },
    include: {
      currentState: true,
      board: { include: { brain: true } },
      lead: true,
    },
  })

  if (!conversation) return { skipped: true, reason: "conversation_not_found" }
  if (!conversation.board) return { skipped: true, reason: "board_not_found" }
  if (conversation.frozen) return { skipped: true, reason: "conversation_frozen" }
  if (!conversation.aiEnabled) return { skipped: true, reason: "ai_disabled" }

  const board = conversation.board
  const state = conversation.currentState ?? (await getCurrentState(conversationId))
  if (!state) return { skipped: true, reason: "no_current_state" }

  const isBoardActive =
    board.adminStatus.toString() !== "SUSPENDED" && board.ownerStatus !== "INACTIVE"
  if (!isBoardActive) return { skipped: true, reason: "board_inactive" }

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

  switch (stateData.type) {
    case "MESSAGE":
      return executeMessageState(conversationId, stateData, board.id)

    case "WAIT":
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
        await transitionState(conversationId, conditional.targetStateId)
        return { advanced: true, newStateId: conditional.targetStateId }
      }
      if (conditional.matchImpossible) {
        return { skipped: true, reason: "condition_not_met" }
      }
      return executeAIState(conversationId, conversation, stateData, board.id)
    }

    case "AI":
    default:
      return executeAIState(conversationId, conversation, stateData, board.id)
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
    lead?: { customData: Record<string, unknown> } | null
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
    escalateOnNoReply: number | null
    escalateOnLowConfidence: boolean
    escalateOnOffMission: boolean
  },
  boardId: string,
): Promise<ExecutionResult> {
  const lastInbound = await prisma.message.findFirst({
    where: { conversationId, direction: "INBOUND" },
    orderBy: { timestamp: "desc" },
  })
  const userMessage = lastInbound?.content ?? ""

  const result = await executeSubAgentRun({ conversationId, boardId, userMessage })

  if (state.escalateOnNoReply && result.responseText) {
    const delayMs = state.escalateOnNoReply * 60 * 60 * 1000
    await enqueueJob({
      type: "escalation_check",
      payload: { conversationId },
      leadId: conversationId,
      boardId,
      scheduledFor: new Date(Date.now() + delayMs),
    }).catch(() => {})
  }

  if (result.action === "transition" && result.targetStateId) {
    return { sent: !!result.responseText, advanced: true, newStateId: result.targetStateId }
  }

  if (result.action === "escalate") {
    return { sent: false, reason: "escalated" }
  }

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
    .catch(() => {})

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
    }).catch(() => {})
    await prisma.conversation
      .update({
        where: { id: conversationId },
        data: { messageCountSinceSum: 0 },
      })
      .catch(() => {})
  }
}
