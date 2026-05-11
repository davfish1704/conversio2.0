import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "@/lib/ai/providers/types"
import { transitionState } from "@/lib/state-machine"
import { sendAIResponse } from "@/lib/messaging/dispatcher"
import { createNotification } from "@/lib/notifications"
import {
  buildSystemPrompt,
  buildPromptMessages,
  sanitizeAIOutput,
  type PromptBrain,
  type PromptState,
  type PromptKnowledge,
} from "@/lib/ai/prompt/builder"
import { extractMemory, loadConversationMemory } from "@/lib/memory/extractor"
import { updateMemory, appendFact } from "@/lib/memory/updater"
import { resolveMemory, formatMemoryForPrompt } from "@/lib/memory/resolver"
import type { ConversationMemory } from "@/lib/memory/schema"
import { recordExecution } from "@/lib/observability"

type BrainRuleRow = { id: string; name: string; rule: string; severity: string }
type BrainFAQRow = { id: string; question: string; answer: string }
type BrainDocRow = { id: string; name: string; content: string }

export interface OrchestrationInput {
  conversationId: string
  boardId: string
  channel: string
  userMessage: string
}

export interface OrchestrationResult {
  action: "respond" | "transition" | "escalate" | "wait" | "complete"
  responseText: string | null
  targetStateId: string | null
  memory: ConversationMemory | null
  intent: string
  confidence: number
}

export async function orchestrate(
  input: OrchestrationInput,
): Promise<OrchestrationResult> {
  const startTime = Date.now()
  const errors: string[] = []

  const { conversationId, boardId, channel, userMessage } = input

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      currentState: true,
      board: { include: { brain: true } },
      lead: true,
    },
  })

  if (!conversation) {
    return {
      action: "wait",
      responseText: null,
      targetStateId: null,
      memory: null,
      intent: "error",
      confidence: 0,
    }
  }

  if (!conversation.board) {
    return {
      action: "wait",
      responseText: null,
      targetStateId: null,
      memory: null,
      intent: "error",
      confidence: 0,
    }
  }

  const board = conversation.board
  const brain = board.brain ?? {
    id: "",
    boardId: board.id,
    systemPrompt: "You are a helpful assistant for an insurance brokerage CRM.",
    stylePrompt: "Be professional, friendly, and concise.",
    infoPrompt: "",
    rulePrompt: "",
    defaultModel: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 500,
    language: "en",
    tone: "friendly" as const,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }

  const state = conversation.currentState
  const stateId = state?.id ?? "unknown"
  const stateName = state?.name ?? "unknown"

  let memory = await resolveMemory(conversationId)

  const extraction = await extractMemory(conversationId, userMessage, boardId)

  if (extraction.customerType !== "unknown") {
    memory.global.customerType = extraction.customerType as any
  }
  if (extraction.intent !== "general") {
    memory.temporary.lastIntent = extraction.intent
    memory.temporary.lastIntentConfidence = extraction.confidence
  }
  for (const [key, value] of Object.entries(extraction.facts)) {
    memory.state.collectedFields[key] = value
  }

  let result: OrchestrationResult = {
    action: "respond",
    responseText: null,
    targetStateId: null,
    memory,
    intent: extraction.intent,
    confidence: extraction.confidence,
  }

  if (extraction.actionNeeded === "transition" && state?.nextStateId) {
    if (conversationId.startsWith("simulate-")) {
      result.action = "transition"
      result.targetStateId = state.nextStateId
    } else {
      await transitionState(conversationId, state.nextStateId)
      result.action = "transition"
      result.targetStateId = state.nextStateId
    }
    recordExecution({
      startTime,
      conversationId,
      stateId,
      stateName,
      boardId,
      channel,
      model: brain.defaultModel ?? "unknown",
      provider: "orchestration",
      systemPrompt: "",
      userMessage,
      toolDefinitions: [],
      structuredMemory: memory,
      transitionDecisions: [{ from: stateName, to: "auto", reason: extraction.intent }],
      rawAIResponse: "",
      parsedAIResponse: { action: "transition", intent: extraction.intent },
      sanitizedResponse: null,
      toolCalls: [],
      toolResults: [],
      tokenUsage: { input: 0, output: 0, total: 0 },
      retryCount: 0,
      errors,
    })
    return result
  }

  if (extraction.actionNeeded === "escalate") {
    if (!conversationId.startsWith("simulate-")) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          frozen: true,
          frozenAt: new Date(),
          frozenReason: `Escalation: ${extraction.intent}`,
          frozenBy: "orchestrator",
        },
      })
      await createNotification(
        boardId,
        conversationId,
        "agent_error",
        `AI escalated: intent=${extraction.intent} msg="${userMessage.slice(0, 100)}"`,
      )
    }
    result.action = "escalate"
    recordExecution({
      startTime,
      conversationId,
      stateId,
      stateName,
      boardId,
      channel,
      model: brain.defaultModel ?? "unknown",
      provider: "orchestration",
      systemPrompt: "",
      userMessage,
      toolDefinitions: [],
      structuredMemory: memory,
      transitionDecisions: [{ action: "escalate", reason: extraction.intent }],
      rawAIResponse: "",
      parsedAIResponse: { action: "escalate", intent: extraction.intent },
      sanitizedResponse: null,
      toolCalls: [],
      toolResults: [],
      tokenUsage: { input: 0, output: 0, total: 0 },
      retryCount: 0,
      errors,
    })
    if (!conversationId.startsWith("simulate-")) {
      await updateMemory(conversationId, memory)
    }
    return result
  }

  const contextWindowSize = board.contextWindowSize ?? 20

  const brainRules = await (prisma as any).brainRule
    .findMany({
      where: { boardId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, rule: true, severity: true },
    })
    .catch(() => [])

  const brainFAQs = await (prisma as any).brainFAQ
    .findMany({
      where: { boardId },
      orderBy: { createdAt: "asc" },
      select: { id: true, question: true, answer: true },
    })
    .catch(() => [])

  const brainDocs = await (prisma as any).brainDocument
    .findMany({
      where: { boardId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, content: true },
    })
    .catch(() => [])

  const knowledge: PromptKnowledge = {
    rules: brainRules as BrainRuleRow[],
    faqs: brainFAQs as BrainFAQRow[],
    docs: brainDocs as BrainDocRow[],
  }

  const brainPrompt: PromptBrain = {
    systemPrompt: brain.systemPrompt,
    stylePrompt: brain.stylePrompt,
    infoPrompt: brain.infoPrompt,
    rulePrompt: brain.rulePrompt,
    language: brain.language,
    tone: brain.tone,
    temperature: brain.temperature,
    maxTokens: brain.maxTokens,
  }

  const statePrompt: PromptState = {
    id: stateId,
    name: stateName,
    type: state?.type ?? "AI",
    mission: state?.mission ?? null,
    rules: state?.rules ?? null,
    nextStateId: state?.nextStateId ?? null,
    dataToCollect: (state?.dataToCollect as string[]) ?? [],
    completionRule: state?.completionRule ?? null,
    availableTools: (state?.availableTools as string[]) ?? [],
  }

  const leadMemories = conversation.leadId
    ? await (prisma as any).leadMemory
        .findMany({
          where: { leadId: conversation.leadId },
          orderBy: { createdAt: "asc" },
          select: { key: true, value: true },
        })
        .catch(() => [])
    : []

  const structuredMemoryStr = formatMemoryForPrompt(memory)

  const systemPrompt = buildSystemPrompt(
    brainPrompt,
    statePrompt,
    leadMemories as { key: string; value: string }[],
    knowledge,
    {
      channel,
      leadChannels: [],
      conversationSummary: conversation.conversationSummary ?? null,
      customData: (conversation.lead?.customData as Record<string, unknown>) ?? {},
      language: brain.language ?? "en",
    },
  )

  const finalSystemPrompt = structuredMemoryStr
    ? `${systemPrompt}\n\n${structuredMemoryStr}`
    : systemPrompt

  const rawHistory = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "desc" },
    take: 5,
    select: { direction: true, content: true },
  })

  const messages: AIMessage[] = buildPromptMessages(
    finalSystemPrompt,
    rawHistory.reverse(),
    userMessage,
    5,
  )

  const temperature =
    brain.temperature != null && brain.temperature > 0
      ? Math.min(brain.temperature, 0.4)
      : 0.3

  let responseText = ""
  let allToolCalls: unknown[] = []
  let allToolResults: unknown[] = []
  let retryCount = 0

  const toolContext = {
    conversationId,
    boardId,
    stateId,
    simulate: conversationId.startsWith("simulate-"),
  }

  const { getToolDefinitions, DEFAULT_AI_STATE_TOOLS } = await import(
    "@/lib/tools/index"
  )
  const rawToolNames: string[] =
    (state?.availableTools as string[] | null) ?? []
  const availableToolNames =
    rawToolNames.length > 0 ? rawToolNames : DEFAULT_AI_STATE_TOOLS
  const toolDefinitions = getToolDefinitions(availableToolNames)

  for (let iteration = 0; iteration < 3; iteration++) {
    const aiResponse = await aiRegistry.execute({
      boardId,
      purpose: "main",
      messages,
      tools: toolDefinitions,
      temperature,
      maxTokens: brain.maxTokens ?? 1000,
    })

    allToolCalls.push(...aiResponse.toolCalls)

    if (aiResponse.finishReason === "stop" && aiResponse.content) {
      responseText = sanitizeAIOutput(aiResponse.content)
      break
    }

    if (aiResponse.finishReason === "tool_calls" && aiResponse.toolCalls.length > 0) {
      const conversationDb = conversation as any
      const boardDb = board as any
      const stateDb = state as any

      messages.push({
        role: "assistant",
        content: "",
        tool_calls: aiResponse.toolCalls,
      })

      if (conversationDb && boardDb && stateDb) {
        const { executeToolCalls } = await import("@/lib/tools/executor")
        const executed = await executeToolCalls({
          toolCalls: aiResponse.toolCalls,
          conversation: conversationDb,
          board: boardDb,
          state: { ...stateDb, availableTools: availableToolNames },
          context: toolContext,
        })
        allToolResults.push(...executed)

        for (const exec of executed) {
          messages.push({
            role: "tool",
            tool_call_id: exec.tool_call_id,
            content: exec.resultText,
          })
        }
      }
      continue
    }

    if (!responseText) {
      responseText = "I'll help you with that shortly."
    }
    break
  }

  if (!conversationId.startsWith("simulate-")) {
    if (responseText) {
      await prisma.message.create({
        data: {
          conversationId,
          direction: "OUTBOUND",
          content: responseText,
          messageType: "TEXT",
          status: "SENT",
          aiGenerated: true,
        },
      })
      await sendAIResponse(conversationId, responseText)
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    for (const [key, value] of Object.entries(extraction.facts)) {
      await appendFact(conversationId, key, value)
    }

    await updateMemory(conversationId, memory)
  }

  result.responseText = responseText

  recordExecution({
    startTime,
    conversationId,
    stateId,
    stateName,
    boardId,
    channel,
    model: brain.defaultModel ?? "unknown",
    provider: "orchestration",
    systemPrompt: finalSystemPrompt,
    userMessage,
    toolDefinitions,
    structuredMemory: memory,
    transitionDecisions: [],
    rawAIResponse: responseText,
    parsedAIResponse: { intent: extraction.intent, action: "respond" },
    sanitizedResponse: responseText,
    toolCalls: allToolCalls,
    toolResults: allToolResults,
    tokenUsage: { input: 0, output: 0, total: 0 },
    retryCount,
    errors,
  })

  const completionRule = state?.completionRule as string | null
  const dataToCollect = state?.dataToCollect as string[] | null
  const nextStateId = state?.nextStateId as string | null

  if (completionRule === "all_collected" && nextStateId && dataToCollect?.length) {
    const collectedKeys = Object.keys(memory.state.collectedFields)
    const allCollected = dataToCollect.every((f) => collectedKeys.includes(f))
    if (allCollected && !conversationId.startsWith("simulate-")) {
      await transitionState(conversationId, nextStateId)
      result.action = "transition"
      result.targetStateId = nextStateId
    }
  }

  return result
}
