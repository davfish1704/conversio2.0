import { prisma } from "@/lib/db"
import { runAgentLoop, type AgentLoopContext } from "@/lib/ai/tool-engine"
import { transitionState } from "@/lib/state-machine"
import { createNotification } from "@/lib/notifications"
import { enqueueJob } from "@/lib/jobs/enqueue"
import { sendMessage as dispatchMessage } from "@/lib/messaging/dispatcher"
import { generateAIResponse } from "@/lib/ai-service"

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
  userMessage: string
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
  if (!conversation.currentState) return { skipped: true, reason: "no_current_state" }
  if (conversation.frozen) return { skipped: true, reason: "conversation_frozen" }
  if (!conversation.aiEnabled) return { skipped: true, reason: "ai_disabled" }

  const board = conversation.board
  const state = conversation.currentState

  const isBoardActive =
    board.adminStatus.toString() !== "SUSPENDED" && board.ownerStatus !== "paused"
  if (!isBoardActive) return { skipped: true, reason: "board_inactive" }

  // Increment message counter and maybe schedule summarization
  await maybeScheduleSummarization(conversationId, conversation.messageCountSinceSum, conversation.summaryUpdatedAt)

  const brain = board.brain ?? {
    systemPrompt: "Du bist ein hilfreicher Assistent.",
    stylePrompt: "Sei freundlich und professionell.",
    infoPrompt: "",
    rulePrompt: "",
    defaultModel: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 500,
    language: "de",
    tone: "friendly",
  }

  switch (state.type) {
    case "MESSAGE":
      return executeMessageState(conversationId, state, board.id)
    case "WAIT":
      return { skipped: true, reason: "wait_state" }
    case "AI":
      return executeAIState(conversation, state, board, brain as typeof board.brain & {})
    case "CONDITION":
    case "TEMPLATE":
    default:
      return executeFallbackState(conversationId, state, brain as typeof board.brain & {}, userMessage)
  }
}

async function executeMessageState(
  conversationId: string,
  state: { id: string; config: unknown },
  boardId: string
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
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } })
  return { sent: true }
}

async function executeAIState(
  conversation: {
    id: string
    boardId: string | null
    channel: string
    customData: unknown
    currentStateId: string | null
    followupCount: number
    lead?: { customData: unknown } | null
  },
  state: {
    id: string
    name: string
    mission: string | null
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
  board: { id: string; contextWindowSize: number },
  brain: {
    systemPrompt: string
    stylePrompt: string
    infoPrompt: string
    rulePrompt: string
    temperature: number
    maxTokens: number
    language: string
    tone: string
  }
): Promise<ExecutionResult> {
  // Load full message history (userMessage already stored in DB by webhook handler)
  const lastInbound = await prisma.message.findFirst({
    where: { conversationId: conversation.id, direction: "INBOUND" },
    orderBy: { timestamp: "desc" },
  })
  const userMessage = lastInbound?.content ?? ""

  // Off-mission check (before responding, if enabled)
  if (state.escalateOnOffMission) {
    const offMission = await classifyOffMission(conversation.id, userMessage, brain, board.id)
    if (offMission) {
      await createNotification(board.id, conversation.id, "off_mission",
        `Nachricht außerhalb der Mission: "${userMessage.slice(0, 100)}"`)
    }
  }

  const loopCtx: AgentLoopContext = {
    conversationId: conversation.id,
    boardId: conversation.boardId ?? "",
    channel: conversation.channel,
    userMessage,
    brain: brain as Parameters<typeof runAgentLoop>[0]["brain"],
    state: {
      id: state.id,
      name: state.name,
      mission: state.mission,
      rules: state.rules,
      type: state.type,
      nextStateId: state.nextStateId,
      dataToCollect: (state.dataToCollect as string[]) ?? [],
      completionRule: state.completionRule,
      availableTools: (state.availableTools as string[]) ?? [],
    },
    customData: (conversation.lead?.customData as Record<string, unknown>) ?? {},
    assets: [],
  }

  const result = await runAgentLoop(loopCtx)

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  })

  // Low confidence check (after responding)
  if (state.escalateOnLowConfidence && result.sentMessages.length > 0) {
    const lowConf = await classifyLowConfidence(
      userMessage,
      result.sentMessages[result.sentMessages.length - 1],
      brain,
      board.id
    )
    if (lowConf) {
      await createNotification(board.id, conversation.id, "low_confidence",
        `KI-Antwort hat geringe Konfidenz. User: "${userMessage.slice(0, 80)}"`)
    }
  }

  // Schedule no-reply escalation check if state has timeout configured
  if (state.escalateOnNoReply && result.sentMessages.length > 0) {
    const delayMs = state.escalateOnNoReply * 60 * 60 * 1000
    await enqueueJob({
      type: "escalation_check",
      payload: { conversationId: conversation.id },
      leadId: conversation.id,
      boardId: board.id,
      scheduledFor: new Date(Date.now() + delayMs),
    })
  }

  if (result.stateTransitions.length > 0) {
    return { sent: true, advanced: true, newStateId: result.stateTransitions[0] }
  }
  return { sent: result.sentMessages.length > 0 }
}

async function executeFallbackState(
  conversationId: string,
  state: { id: string; name: string; mission: string | null; rules: string | null },
  brain: { systemPrompt: string; stylePrompt: string; infoPrompt: string; rulePrompt: string; temperature: number; maxTokens: number },
  userMessage: string
): Promise<ExecutionResult> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "desc" },
    take: 10,
    select: { direction: true, content: true, timestamp: true },
  })

  const context = messages.reverse().map((m) => ({
    direction: m.direction,
    content: m.content,
    timestamp: m.timestamp,
  }))

  const text = await generateAIResponse(brain as Parameters<typeof generateAIResponse>[0], state as Parameters<typeof generateAIResponse>[1], context, userMessage)

  await prisma.message.create({
    data: { conversationId, direction: "OUTBOUND", content: text, messageType: "TEXT", status: "SENT", aiGenerated: true },
  })
  await dispatchMessage(conversationId, text)
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } })
  return { sent: true }
}

// ── Secondary classification calls ───────────────────────────────────────────

async function classifyLowConfidence(
  userMessage: string,
  aiResponse: string,
  brain: { systemPrompt: string },
  boardId: string
): Promise<boolean> {
  try {
    const { aiRegistry } = await import("@/lib/ai/registry")
    const res = await aiRegistry.execute({
      boardId,
      purpose: "classification",
      messages: [
        { role: "system", content: "Du bewertest AI-Antworten auf einer Skala von 0 bis 1. Antworte NUR mit einer Zahl zwischen 0.0 und 1.0." },
        { role: "user", content: `Nutzerfrage: "${userMessage}"\n\nAI-Antwort: "${aiResponse}"\n\nWie sicher ist diese Antwort in der Beantwortung der Frage (0.0 = unsicher, 1.0 = sehr sicher)?` },
      ],
      maxTokens: 10,
      temperature: 0,
    })
    const score = parseFloat(res.content?.trim() ?? "1")
    return score < 0.5
  } catch {
    return false
  }
}

async function classifyOffMission(
  conversationId: string,
  userMessage: string,
  brain: { systemPrompt: string },
  boardId: string
): Promise<boolean> {
  try {
    const { aiRegistry } = await import("@/lib/ai/registry")
    const res = await aiRegistry.execute({
      boardId,
      purpose: "classification",
      messages: [
        {
          role: "system",
          content: `${brain.systemPrompt}\n\nBeantworte die folgende Frage mit genau "yes", "no" oder "unclear".`,
        },
        {
          role: "user",
          content: `Ist diese Nutzernachricht mit der Mission und dem Wissen des Assistenten beantwortbar?\n\nNachricht: "${userMessage}"`,
        },
      ],
      maxTokens: 10,
      temperature: 0,
    })
    const answer = res.content?.trim().toLowerCase() ?? "yes"
    return answer === "no" || answer === "unclear"
  } catch {
    return false
  }
}

// ── Conversation summarization trigger ────────────────────────────────────────

async function maybeScheduleSummarization(
  conversationId: string,
  messageCountSinceSum: number,
  summaryUpdatedAt: Date | null
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { messageCountSinceSum: { increment: 1 } },
  })

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
    })
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { messageCountSinceSum: 0 },
    })
  }
}
