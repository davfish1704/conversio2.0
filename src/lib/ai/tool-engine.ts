// src/lib/ai/tool-engine.ts
// Decision-Loop für die AI Agent Engine

import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "@/lib/ai/providers/types"
import { transitionState } from "@/lib/state-machine"
import type { BoardBrain, BoardAsset } from "@prisma/client"

// V3 type — not yet in generated client
type LeadMemory = { key: string; value: string }
type BrainRuleRow = { id: string; name: string; rule: string; severity: string }
type BrainFAQRow = { id: string; question: string; answer: string }
type BrainDocRow = { id: string; name: string; content: string }

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

  // Determine which tools this state exposes to the AI; fall back to defaults for unconfigured states
  const rawToolNames: string[] =
    ctx.state.availableTools?.length
      ? ctx.state.availableTools
      : (state?.availableTools as string[] | null) ?? []

  const { getToolDefinitions, DEFAULT_AI_STATE_TOOLS } = await import("@/lib/tools/index")
  const availableToolNames = rawToolNames.length > 0 ? rawToolNames : DEFAULT_AI_STATE_TOOLS
  const toolDefinitions = getToolDefinitions(availableToolNames)

  // Lade leadId für Memory-Abfrage
  const convForMemory = await (prisma as any).conversation.findUnique({
    where: { id: ctx.conversationId },
    select: { leadId: true, conversationSummary: true },
  })

  const [memories, brainRules, brainFAQs, brainDocs, leadConversations] = await Promise.all([
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
  const convSummaryRow = convForMemory

  const contextWindowSize = (board as { contextWindowSize?: number } | null)?.contextWindowSize ?? 20
  const systemPrompt = buildSystemPrompt(
    ctx,
    memories,
    convSummaryRow?.conversationSummary ?? null,
    brainRules as BrainRuleRow[],
    brainFAQs as BrainFAQRow[],
    brainDocs as BrainDocRow[],
    (leadConversations as { channel: string }[]).map((c) => c.channel),
  )

  if (!simulate) {
    await prisma.executionLog.create({
      data: {
        boardId: ctx.boardId,
        conversationId: ctx.conversationId,
        stateId: ctx.state.id,
        action: "BRAIN_CONTEXT_LOADED",
        status: "SUCCESS",
        context: {
          rulesCount: (brainRules as BrainRuleRow[]).length,
          faqCount: (brainFAQs as BrainFAQRow[]).length,
          docsCount: (brainDocs as BrainDocRow[]).length,
          ruleNames: (brainRules as BrainRuleRow[]).map((r) => r.name),
        },
      },
    }).catch(() => {/* non-critical — don't break the loop */})
  }

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

    console.log(`[agent-loop] iter=${iteration} finishReason=${response.finishReason} contentLen=${response.content?.length ?? 0} toolCalls=${response.toolCalls.length}`)

    if (response.finishReason === "stop") {
      if (response.content) {
        console.log(`[agent-loop] sending reply: "${response.content.slice(0, 80)}..."`)
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

      if (!conversation || !board || !state) {
        for (const tc of response.toolCalls) {
          messages.push({ role: "tool", tool_call_id: tc.id, content: "FEHLER: Konversation/Board/State nicht geladen" })
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
          messages.push({ role: "tool", tool_call_id: exec.tool_call_id, content: exec.resultText })

          if (exec.result.success && exec.toolName === "advance_state") {
            const targetName = (exec.result.data as { targetState?: string })?.targetState
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

  // completionRule: all_collected → auto-transition via lead memory check
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
      const collectedKeys = (leadMemories as any[]).map((m: any) => m.key)
      const allCollected = ctx.state.dataToCollect!.every((f) => collectedKeys.includes(f))
      if (allCollected) {
        await transitionState(ctx.conversationId, ctx.state.nextStateId)
        result.stateTransitions.push(ctx.state.nextStateId)
        console.log(`completionRule=all_collected -> transitioned to ${ctx.state.nextStateId}`)
      }
    }
  }

  return result
}

// ── Prompt-Stack Builder ──────────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: AgentLoopContext,
  memories: Pick<LeadMemory, "key" | "value">[],
  conversationSummary: string | null = null,
  brainRules: BrainRuleRow[] = [],
  brainFAQs: BrainFAQRow[] = [],
  brainDocs: BrainDocRow[] = [],
  leadChannels: string[] = [],
): string {
  const parts: string[] = []

  if (ctx.brain.systemPrompt) parts.push(ctx.brain.systemPrompt)
  if (ctx.brain.stylePrompt) parts.push(`STYLE: ${ctx.brain.stylePrompt}`)
  if (ctx.brain.infoPrompt) parts.push(`CONTEXT/KNOWLEDGE: ${ctx.brain.infoPrompt}`)
  if (ctx.brain.rulePrompt) parts.push(`RULES: ${ctx.brain.rulePrompt}`)

  // ── Brain Rules ────────────────────────────────────────────────────────────
  if (brainRules.length > 0) {
    parts.push(
      `## Constraints (Rules)\n${brainRules.map((r) => `- ${r.rule}`).join("\n")}`
    )
  }

  // ── Brain FAQs ─────────────────────────────────────────────────────────────
  if (brainFAQs.length > 0) {
    parts.push(
      `## FAQ (use to answer common questions)\n${brainFAQs
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n")}`
    )
  }

  // ── Brain Documents ────────────────────────────────────────────────────────
  if (brainDocs.length > 0) {
    const MAX_TOTAL_CHARS = 3000
    let remaining = MAX_TOTAL_CHARS
    const snippets: string[] = []
    for (const doc of brainDocs) {
      if (remaining <= 0) break
      const snippet = doc.content.slice(0, remaining)
      snippets.push(`### ${doc.name}\n${snippet}`)
      remaining -= snippet.length
    }
    parts.push(`## Knowledge Base\n${snippets.join("\n\n")}`)
  }

  if (conversationSummary) {
    parts.push(`GESPRÄCHSZUSAMMENFASSUNG (vorherige Nachrichten):\n${conversationSummary}`)
  }

  // ── Channel Context ────────────────────────────────────────────────────────
  const channelSection = [
    `- Active channel: ${ctx.channel}`,
    leadChannels.length > 0 ? `- Lead's channels: ${[...new Set(leadChannels)].join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")
  parts.push(`## Current Conversation Context\n${channelSection}`)

  parts.push(`CURRENT STATE: ${ctx.state.name}`)
  if (ctx.state.mission) parts.push(`MISSION: ${ctx.state.mission}`)
  if (ctx.state.rules) parts.push(`BEHAVIOR RULES: ${ctx.state.rules}`)

  if (memories.length > 0) {
    parts.push(`MEMORY:\n${memories.map((m) => `${m.key}: ${m.value}`).join("\n")}`)
  }

  const dataToCollect = ctx.state.dataToCollect ?? []
  if (dataToCollect.length > 0) {
    const collectedFromMemory = memories.map((m) => m.key)
    const needed = dataToCollect.filter((k) => !collectedFromMemory.includes(k))
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
