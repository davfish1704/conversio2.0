// src/lib/ai/tool-engine.ts
// Decision-Loop für die AI Agent Engine

import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "@/lib/ai/providers/types"
import { transitionState } from "@/lib/state-machine"
import type { BoardBrain, BoardAsset, ConversationMemory } from "@prisma/client"

// Lazy import to avoid circular deps — tools/index seeds the registry on first import
let toolsReady = false
async function ensureToolsRegistered() {
  if (!toolsReady) {
    await import("@/lib/tools/index")
    toolsReady = true
  }
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AgentLoopContext {
  conversationId: string
  boardId: string
  waAccountId: string
  customerPhone: string
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
  collectedFields?: string[]
  customData?: Record<string, unknown>
  assets: BoardAsset[]
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

// ── Decision Loop ─────────────────────────────────────────────────────────────

export async function runAgentLoop(
  ctx: AgentLoopContext,
  options?: AgentLoopOptions
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

  // Load full DB objects for the executor
  const [conversation, board, state] = await Promise.all([
    prisma.conversation.findUnique({ where: { id: ctx.conversationId } }),
    prisma.board.findUnique({ where: { id: ctx.boardId } }),
    prisma.state.findUnique({ where: { id: ctx.state.id } }),
  ])

  // Determine which tools this state exposes to the AI
  const availableToolNames: string[] =
    (ctx.state.availableTools?.length
      ? ctx.state.availableTools
      : (state?.availableTools as string[] | null) ?? [])

  // If the state has no availableTools configured, fall back to the Phase-1 set
  // so existing boards continue to work unchanged
  const useLegacyTools = availableToolNames.length === 0

  let toolDefinitions: import("@/lib/ai/providers/types").ToolDefinition[]
  if (useLegacyTools) {
    // Use the old hardcoded tool definitions from tools.ts
    const { TOOL_DEFINITIONS } = await import("@/lib/ai/tools")
    toolDefinitions = TOOL_DEFINITIONS
  } else {
    const { getToolDefinitions } = await import("@/lib/tools/index")
    toolDefinitions = getToolDefinitions(availableToolNames)
  }

  const [memories, convSummaryRow] = await Promise.all([
    prisma.conversationMemory.findMany({
      where: { conversationId: ctx.conversationId },
      orderBy: { createdAt: "asc" },
      select: { key: true, value: true },
    }),
    prisma.conversation.findUnique({
      where: { id: ctx.conversationId },
      select: { conversationSummary: true },
    }),
  ])

  const contextWindowSize = (board as { contextWindowSize?: number } | null)?.contextWindowSize ?? 20
  const systemPrompt = buildSystemPrompt(ctx, memories, convSummaryRow?.conversationSummary ?? null)

  const history = await prisma.message.findMany({
    where: { conversationId: ctx.conversationId },
    orderBy: { timestamp: "desc" },
    take: contextWindowSize,
    select: { direction: true, content: true },
  })

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.reverse().map((msg): AIMessage => ({
      role: msg.direction === "INBOUND" ? "user" : "assistant",
      content: msg.content,
    })),
    { role: "user", content: ctx.userMessage },
  ]

  // ── Iteration-Loop ─────────────────────────────────────────────────────────
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await aiRegistry.execute({
      boardId: ctx.boardId,
      purpose: "main",
      messages,
      tools: toolDefinitions,
      temperature: ctx.brain.temperature ?? 0.7,
      maxTokens: ctx.brain.maxTokens ?? 1000,
    })

    result.toolCallCount += response.toolCalls.length

    if (response.finishReason === "stop") {
      if (response.content) {
        if (!simulate) {
          await prisma.message.create({
            data: {
              conversationId: ctx.conversationId,
              direction: "OUTBOUND",
              content: response.content,
              messageType: "TEXT",
              status: "SENT",
              aiGenerated: true,
            },
          })
          const { sendMessage } = await import("@/lib/messaging/dispatcher")
          await sendMessage(ctx.conversationId, response.content)
        }
        result.sentMessages.push(response.content)
      }
      result.finishReason = "stop"
      break
    }

    if (response.finishReason === "length") {
      result.finishReason = "length"
      if (!simulate) {
        await prisma.executionLog.create({
          data: {
            boardId: ctx.boardId,
            conversationId: ctx.conversationId,
            stateId: ctx.state.id,
            action: "AGENT_LOOP_LENGTH",
            input: ctx.userMessage,
            output: response.content,
            status: "ERROR",
            errorMessage: "finish_reason: length — Context limit reached",
            needsAttention: true,
          },
        })
      }
      break
    }

    if (response.finishReason === "tool_calls" && response.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: response.content ?? "",
        tool_calls: response.toolCalls,
      })

      if (useLegacyTools || !conversation || !board || !state) {
        // Legacy path: use old executeTool dispatcher
        const { executeTool } = await import("@/lib/ai/tools")
        const legacyCtx = {
          conversationId: ctx.conversationId,
          boardId: ctx.boardId,
          waAccountId: ctx.waAccountId,
          customerPhone: ctx.customerPhone,
          channel: ctx.channel,
          simulate,
          sentMessages: result.sentMessages,
          stateTransitions: result.stateTransitions,
          dataToCollect: ctx.state.dataToCollect ?? [],
        }
        for (const tc of response.toolCalls) {
          const toolResult = await executeTool(tc.name, tc.arguments, legacyCtx)
          messages.push({ role: "tool", tool_call_id: tc.id, content: toolResult })
        }
      } else {
        // New path: use typed executor with ToolCallLog
        const { executeToolCalls } = await import("@/lib/tools/executor")
        const executed = await executeToolCalls({
          toolCalls: response.toolCalls,
          conversation,
          board,
          state: { ...state, availableTools: availableToolNames },
          context: toolContext,
        })

        for (const exec of executed) {
          messages.push({ role: "tool", tool_call_id: exec.tool_call_id, content: exec.resultText })

          // Track state transitions triggered by tools
          if (exec.result.success && exec.toolName === "advance_state") {
            const targetName = (exec.result.data as { targetState?: string })?.targetState
            if (targetName) result.stateTransitions.push(targetName)
          }
          // Track sent messages from send_text legacy tool
          if (exec.result.success && exec.toolName === "send_text") {
            // Already sent by the tool; don't double-push but track in sentMessages
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
      await prisma.executionLog.create({
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
    }
  }

  // completionRule: all_collected → auto-transition
  if (
    !simulate &&
    ctx.state.completionRule === "all_collected" &&
    ctx.state.nextStateId &&
    (ctx.state.dataToCollect?.length ?? 0) > 0 &&
    !result.stateTransitions.includes(ctx.state.nextStateId)
  ) {
    const conv = await prisma.conversation.findUnique({
      where: { id: ctx.conversationId },
      select: { collectedFields: true },
    })
    const latestCollected = ((conv?.collectedFields ?? []) as string[])
    const allCollected = ctx.state.dataToCollect!.every((f) => latestCollected.includes(f))
    if (allCollected) {
      await transitionState(ctx.conversationId, ctx.state.nextStateId)
      result.stateTransitions.push(ctx.state.nextStateId)
      console.log(`✅ completionRule=all_collected → transitioned to ${ctx.state.nextStateId}`)
    }
  }

  return result
}

// ── Prompt-Stack Builder ──────────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: AgentLoopContext,
  memories: Pick<ConversationMemory, "key" | "value">[],
  conversationSummary: string | null = null
): string {
  const parts: string[] = []

  if (ctx.brain.systemPrompt) parts.push(ctx.brain.systemPrompt)
  if (ctx.brain.stylePrompt) parts.push(`STYLE: ${ctx.brain.stylePrompt}`)
  if (ctx.brain.infoPrompt) parts.push(`CONTEXT/KNOWLEDGE: ${ctx.brain.infoPrompt}`)
  if (ctx.brain.rulePrompt) parts.push(`RULES: ${ctx.brain.rulePrompt}`)

  if (conversationSummary) {
    parts.push(`GESPRÄCHSZUSAMMENFASSUNG (vorherige Nachrichten):\n${conversationSummary}`)
  }

  parts.push(`CURRENT STATE: ${ctx.state.name}`)
  if (ctx.state.mission) parts.push(`MISSION: ${ctx.state.mission}`)
  if (ctx.state.rules) parts.push(`BEHAVIOR RULES: ${ctx.state.rules}`)

  if (memories.length > 0) {
    parts.push(`MEMORY:\n${memories.map((m) => `${m.key}: ${m.value}`).join("\n")}`)
  }

  const dataToCollect = ctx.state.dataToCollect ?? []
  if (dataToCollect.length > 0) {
    const alreadyCollected = ctx.collectedFields ?? []
    const needed = dataToCollect.filter((k) => !alreadyCollected.includes(k))
    if (needed.length > 0) {
      parts.push(
        `NOCH ZU SAMMELN: ${needed.join(", ")}\nNutze update_lead_data um diese Werte zu speichern sobald der Kunde sie nennt.`
      )
    } else {
      parts.push("DATENSAMMLUNG: Alle benötigten Felder wurden bereits gesammelt.")
    }
  }

  const customData = ctx.customData ?? {}
  if (Object.keys(customData).length > 0) {
    parts.push(`BEREITS BEKANNT: ${Object.entries(customData).map(([k, v]) => `${k}: ${v}`).join(", ")}`)
  }

  return parts.join("\n\n")
}
