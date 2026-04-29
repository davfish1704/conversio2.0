// src/lib/ai/tool-engine.ts
// Decision-Loop für die AI Agent Engine (Sprint 4, Schritt 4)

import { prisma } from "@/lib/db"
import { groqChatWithTools, type GroqToolMessage } from "@/lib/ai/groq-client"
import { TOOL_DEFINITIONS, executeTool, type ToolContext } from "@/lib/ai/tools"
import type { BoardBrain, BoardAsset, ConversationMemory } from "@prisma/client"

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AgentLoopContext {
  conversationId: string
  boardId: string
  waAccountId: string
  customerPhone: string
  userMessage: string
  brain: BoardBrain
  state: {
    id: string
    name: string
    mission: string | null
    rules: string | null
    type: string
  }
  assets: BoardAsset[]
}

export interface AgentLoopOptions {
  simulate?: boolean       // default false
  maxIterations?: number   // default 5
}

export interface AgentLoopResult {
  sentMessages: string[]      // Texte die gesendet / simuliert wurden
  stateTransitions: string[]  // State-IDs zu denen transitioniert wurde
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

  const result: AgentLoopResult = {
    sentMessages: [],
    stateTransitions: [],
    toolCallCount: 0,
    finishReason: "unknown",
  }

  // ToolContext initialisieren (wird an executeTool weitergegeben)
  const toolCtx: ToolContext = {
    conversationId: ctx.conversationId,
    boardId: ctx.boardId,
    waAccountId: ctx.waAccountId,
    customerPhone: ctx.customerPhone,
    simulate,
    sentMessages: result.sentMessages,
    stateTransitions: result.stateTransitions,
  }

  // Memories laden (Read-Only — auch im Simulate-Modus OK)
  const memories = await prisma.conversationMemory.findMany({
    where: { conversationId: ctx.conversationId },
    orderBy: { createdAt: "asc" },
    select: { key: true, value: true },
  })

  // System-Prompt aus Brain + State + Memory aufbauen
  const systemPrompt = buildSystemPrompt(ctx, memories)

  // Letzte 10 Nachrichten als History laden
  const history = await prisma.message.findMany({
    where: { conversationId: ctx.conversationId },
    orderBy: { timestamp: "desc" },
    take: 10,
    select: { direction: true, content: true },
  })

  const historyMessages: GroqToolMessage[] = history
    .reverse()
    .map((msg) => ({
      role: msg.direction === "INBOUND" ? "user" : "assistant",
      content: msg.content,
    }))

  const messages: GroqToolMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: ctx.userMessage },
  ]

  // ── Iteration-Loop ─────────────────────────────────────────────────────────
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await groqChatWithTools(messages, TOOL_DEFINITIONS)

    result.toolCallCount += response.toolCalls.length

    // finish_reason === "stop" → Loop beenden
    if (response.finishReason === "stop") {
      result.finishReason = "stop"
      break
    }

    // finish_reason === "length" → Context-Limit erreicht
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
            errorMessage: "Groq finish_reason: length — Context limit reached",
            needsAttention: true,
          },
        })
      }
      break
    }

    // finish_reason === "tool_calls" → Tools ausführen und nächste Runde
    if (response.finishReason === "tool_calls") {
      messages.push({
        role: "assistant",
        content: null,
        tool_calls: response.toolCalls,
      })

      for (const toolCall of response.toolCalls) {
        let args: Record<string, unknown>
        try {
          args = JSON.parse(toolCall.function.arguments)
        } catch {
          args = {}
        }

        const toolResult = await executeTool(
          toolCall.function.name,
          args,
          toolCtx
        )

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        })
      }

      continue
    }

    // Unbekannter finish_reason → abbrechen
    result.finishReason = response.finishReason
    break
  }

  // ── Loop-Guard: maxIterations erreicht ohne "stop" ─────────────────────────
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

  return result
}

// ── Prompt-Stack Builder ──────────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: AgentLoopContext,
  memories: Pick<ConversationMemory, "key" | "value">[]
): string {
  const parts: string[] = []

  if (ctx.brain.systemPrompt) {
    parts.push(ctx.brain.systemPrompt)
  }

  if (ctx.brain.stylePrompt) {
    parts.push(`STYLE: ${ctx.brain.stylePrompt}`)
  }

  if (ctx.brain.infoPrompt) {
    parts.push(`CONTEXT/KNOWLEDGE: ${ctx.brain.infoPrompt}`)
  }

  if (ctx.brain.rulePrompt) {
    parts.push(`RULES: ${ctx.brain.rulePrompt}`)
  }

  parts.push(`CURRENT STATE: ${ctx.state.name}`)

  if (ctx.state.mission) {
    parts.push(`MISSION: ${ctx.state.mission}`)
  }

  if (ctx.state.rules) {
    parts.push(`BEHAVIOR RULES: ${ctx.state.rules}`)
  }

  if (memories.length > 0) {
    const memoryLines = memories
      .map((m) => `${m.key}: ${m.value}`)
      .join("\n")
    parts.push(`MEMORY:\n${memoryLines}`)
  }

  return parts.join("\n\n")
}
