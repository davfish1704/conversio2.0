import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "@/lib/ai/providers/types"
import { transitionState } from "@/lib/state-machine"
import type { BoardBrain, BoardAsset } from "@prisma/client"
import {
  buildSystemPrompt,
  buildPromptMessages,
  sanitizeAIOutput,
  type PromptBrain,
  type PromptState,
  type PromptKnowledge,
  type PromptTransition,
} from "@/lib/ai/prompt/builder"

type LeadMemory = { key: string; value: string }
type BrainRuleRow = { id: string; name: string; rule: string; severity: string }
type BrainFAQRow = { id: string; question: string; answer: string }
type BrainDocRow = { id: string; name: string; content: string }

let toolsReady = false
async function ensureToolsRegistered() {
  if (!toolsReady) {
    await import("@/lib/tools/index")
    toolsReady = true
  }
}

export interface AgentLoopContext {
  conversationId: string
  boardId: string
  channel: string
  userMessage: string
  brain: BoardBrain
  state: {
    id: string
    name: string
    mission: string | null
    rules: string | null
    type: string
    nextStateId?: string | null
    dataToCollect?: string[]
    completionRule?: string | null
    availableTools?: string[]
  }
  customData?: Record<string, unknown>
  assets: BoardAsset[]
  previousStateName?: string | null
}

export interface AgentLoopOptions {
  simulate?: boolean
  maxIterations?: number
}

export interface AgentLoopResult {
  sentMessages: string[]
  stateTransitions: string[]
  toolCallCount: number
  finishReason: string
}

export async function runAgentLoop(
  ctx: AgentLoopContext,
  options?: AgentLoopOptions,
): Promise<AgentLoopResult> {
  const simulate = options?.simulate ?? false
  const maxIterations = options?.maxIterations ?? 5

  await ensureToolsRegistered()

  const result: AgentLoopResult = {
    sentMessages: [],
    stateTransitions: [],
    toolCallCount: 0,
    finishReason: "unknown",
  }

  const toolContext = {
    conversationId: ctx.conversationId,
    boardId: ctx.boardId,
    stateId: ctx.state.id,
    simulate,
  }

  const [conversation, board, state] = await Promise.all([
    prisma.conversation.findUnique({ where: { id: ctx.conversationId } }),
    prisma.board.findUnique({ where: { id: ctx.boardId } }),
    prisma.state.findUnique({ where: { id: ctx.state.id } }),
  ])

  const rawToolNames: string[] =
    ctx.state.availableTools?.length
      ? ctx.state.availableTools
      : (state?.availableTools as string[] | null) ?? []

  const { getToolDefinitions, DEFAULT_AI_STATE_TOOLS } = await import("@/lib/tools/index")
  const availableToolNames = rawToolNames.length > 0 ? rawToolNames : DEFAULT_AI_STATE_TOOLS
  const toolDefinitions = getToolDefinitions(availableToolNames)

  const convForMemory = await (prisma as any).conversation.findUnique({
    where: { id: ctx.conversationId },
    select: { leadId: true, conversationSummary: true },
  })

  const [memories, brainRules, brainFAQs, brainDocs, leadConversations] =
    await Promise.all([
      convForMemory?.leadId
        ? (prisma as any).leadMemory.findMany({
            where: { leadId: convForMemory.leadId },
            orderBy: { createdAt: "asc" },
            select: { key: true, value: true },
          })
        : Promise.resolve([]),
      (prisma as any).brainRule.findMany({
        where: { boardId: ctx.boardId, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, rule: true, severity: true },
      }),
      (prisma as any).brainFAQ.findMany({
        where: { boardId: ctx.boardId },
        orderBy: { createdAt: "asc" },
        select: { id: true, question: true, answer: true },
      }),
      (prisma as any).brainDocument.findMany({
        where: { boardId: ctx.boardId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, content: true },
      }),
      convForMemory?.leadId
        ? prisma.conversation.findMany({
            where: { leadId: convForMemory.leadId },
            select: { channel: true },
          })
        : Promise.resolve([]),
    ])

  const contextWindowSize =
    (board as { contextWindowSize?: number } | null)?.contextWindowSize ?? 20

  const transition: PromptTransition | null = ctx.previousStateName
    ? {
        fromState: ctx.previousStateName,
        toState: ctx.state.name,
        mission: ctx.state.mission,
      }
    : null

  const knowledge: PromptKnowledge = {
    rules: brainRules as BrainRuleRow[],
    faqs: brainFAQs as BrainFAQRow[],
    docs: brainDocs as BrainDocRow[],
  }

  const brainPrompt = ctx.brain as unknown as PromptBrain
  const statePrompt: PromptState = {
    id: ctx.state.id,
    name: ctx.state.name,
    type: ctx.state.type,
    mission: ctx.state.mission,
    rules: ctx.state.rules,
    nextStateId: ctx.state.nextStateId,
    dataToCollect: ctx.state.dataToCollect,
    completionRule: ctx.state.completionRule,
    availableTools: ctx.state.availableTools,
  }

  const brainLanguage = (ctx.brain as { language?: string }).language || "en"

  const systemPrompt = buildSystemPrompt(brainPrompt, statePrompt, memories, knowledge, {
    channel: ctx.channel,
    leadChannels: (leadConversations as { channel: string }[]).map((c) => c.channel),
    conversationSummary: convForMemory?.conversationSummary ?? null,
    customData: ctx.customData ?? {},
    transition,
    language: brainLanguage,
  })

  if (!simulate) {
    await prisma.executionLog
      .create({
        data: {
          boardId: ctx.boardId,
          conversationId: ctx.conversationId,
          stateId: ctx.state.id,
          action: "BRAIN_CONTEXT_LOADED",
          status: "SUCCESS",
          context: {
            rulesCount: brainRules.length,
            faqCount: brainFAQs.length,
            docsCount: brainDocs.length,
            ruleNames: (brainRules as BrainRuleRow[]).map((r) => r.name),
          },
        },
      })
      .catch(() => {})
  }

  const history = await prisma.message.findMany({
    where: { conversationId: ctx.conversationId },
    orderBy: { timestamp: "desc" },
    take: contextWindowSize,
    select: { direction: true, content: true },
  })

  const messages: AIMessage[] = buildPromptMessages(
    systemPrompt,
    history.reverse(),
    ctx.userMessage,
    contextWindowSize,
  )

  const temperature =
    ctx.brain.temperature != null && ctx.brain.temperature > 0
      ? Math.min(ctx.brain.temperature, 0.4)
      : 0.3

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await aiRegistry.execute({
      boardId: ctx.boardId,
      purpose: "main",
      messages,
      tools: toolDefinitions,
      temperature,
      maxTokens: ctx.brain.maxTokens ?? 1000,
    })

    result.toolCallCount += response.toolCalls.length

    if (!simulate && response.usage.totalTokens > 0) {
      prisma.usageLog
        .create({
          data: {
            boardId: ctx.boardId,
            conversationId: ctx.conversationId,
            model: response.model,
            provider: response.provider,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            totalTokens: response.usage.totalTokens,
            providerCost: response.providerCost,
          },
        })
        .catch(() => {})
    }

    if (response.finishReason === "stop") {
      if (response.content) {
        const cleaned = sanitizeAIOutput(response.content)
        if (cleaned) {
          if (!simulate) {
            await prisma.message.create({
              data: {
                conversationId: ctx.conversationId,
                direction: "OUTBOUND",
                content: cleaned,
                messageType: "TEXT",
                status: "SENT",
                aiGenerated: true,
              },
            })
            const { sendAIResponse } = await import("@/lib/messaging/dispatcher")
            await sendAIResponse(ctx.conversationId, cleaned)
          }
          result.sentMessages.push(cleaned)
        }
      }
      result.finishReason = "stop"
      break
    }

    if (response.finishReason === "length") {
      result.finishReason = "length"
      if (!simulate) {
        await prisma.executionLog
          .create({
            data: {
              boardId: ctx.boardId,
              conversationId: ctx.conversationId,
              stateId: ctx.state.id,
              action: "AGENT_LOOP_LENGTH",
              input: ctx.userMessage,
              output: response.content,
              status: "ERROR",
              errorMessage: "finish_reason: length - Context limit reached",
              needsAttention: true,
            },
          })
          .catch(() => {})
      }
      break
    }

    if (response.finishReason === "tool_calls" && response.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: "",
        tool_calls: response.toolCalls,
      })

      if (!conversation || !board || !state) {
        for (const tc of response.toolCalls) {
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: "ERROR: Conversation/Board/State not loaded",
          })
        }
      } else {
        const { executeToolCalls } = await import("@/lib/tools/executor")
        const executed = await executeToolCalls({
          toolCalls: response.toolCalls,
          conversation,
          board,
          state: { ...state, availableTools: availableToolNames },
          context: toolContext,
        })

        for (const exec of executed) {
          messages.push({
            role: "tool",
            tool_call_id: exec.tool_call_id,
            content: exec.resultText,
          })

          if (exec.result.success && exec.toolName === "advance_state") {
            const targetName = (
              exec.result.data as { targetState?: string }
            )?.targetState
            if (targetName) result.stateTransitions.push(targetName)
          }
        }
      }
      continue
    }

    result.finishReason = response.finishReason
    break
  }

  if (result.finishReason !== "stop" && result.finishReason !== "length") {
    result.finishReason = "max_iterations"
    if (!simulate) {
      await prisma.executionLog
        .create({
          data: {
            boardId: ctx.boardId,
            conversationId: ctx.conversationId,
            stateId: ctx.state.id,
            action: "AGENT_LOOP_MAX_ITERATIONS",
            input: ctx.userMessage,
            status: "LOOP",
            errorMessage: "Tool-Loop max iterations reached",
            needsAttention: true,
          },
        })
        .catch(() => {})
    }
  }

  if (
    !simulate &&
    ctx.state.completionRule === "all_collected" &&
    ctx.state.nextStateId &&
    (ctx.state.dataToCollect?.length ?? 0) > 0 &&
    !result.stateTransitions.includes(ctx.state.nextStateId)
  ) {
    const convForCheck = await (prisma as any).conversation.findUnique({
      where: { id: ctx.conversationId },
      select: { leadId: true },
    })
    if (convForCheck?.leadId) {
      const leadMemories = await (prisma as any).leadMemory.findMany({
        where: { leadId: convForCheck.leadId },
        select: { key: true },
      })
      const allCollected = ctx.state.dataToCollect!.every((f) =>
        leadMemories.map((m: any) => m.key).includes(f),
      )
      if (allCollected) {
        await transitionState(ctx.conversationId, ctx.state.nextStateId)
        result.stateTransitions.push(ctx.state.nextStateId)
      }
    }
  }

  return result
}
