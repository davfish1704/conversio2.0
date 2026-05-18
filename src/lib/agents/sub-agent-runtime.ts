import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "@/lib/ai/providers/types"
import { transitionState } from "@/lib/state-machine"
import { sendAIResponse } from "@/lib/messaging/dispatcher"
import { sanitizeAIOutput } from "@/lib/ai/prompt/builder"
import { resolveMemory, formatMemoryForPrompt } from "@/lib/memory/resolver"
import { extractMemory } from "@/lib/memory/extractor"
import { updateMemory, appendFact } from "@/lib/memory/updater"
import { randomUUID } from "node:crypto"
import { getToolDefinitions } from "@/lib/tools"
import { executeToolCalls } from "@/lib/tools/executor"
import { evaluateHandoffRules, decideHandoff, loadHandoffContext } from "./handoff-engine"
import type { AgentRunOutcome } from "@prisma/client"
import {
  buildSubAgentSystemPrompt,
  type PromptBuilderInput,
  type SubAgentBrain,
  type SubAgentKnowledge,
} from "./sub-agent-prompt-builder"

// Always available in every AI state
const ALWAYS_ON_TOOLS = ["handoff_proposed", "escalate_to_supervisor"]
const MAX_TOOL_ITERATIONS = 5

export interface SubAgentRunInput {
  conversationId: string
  boardId: string
  userMessage: string
}

export interface SubAgentRunResult {
  responseText: string | null
  action: "respond" | "transition" | "escalate" | "wait"
  targetStateId: string | null
  handoffProposed: boolean
  agentConfidence: number | null
  outcome: AgentRunOutcome
}

export async function executeSubAgentRun(
  input: SubAgentRunInput,
): Promise<SubAgentRunResult> {
  const { conversationId, boardId, userMessage } = input
  const runStart = Date.now()

  // ── Step 1: Load Context ───────────────────────────────────────────────────

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      currentState: true,
      board: {
        include: {
          brain:          true,
          brainRules:     { where: { isActive: true }, select: { id: true, name: true, rule: true, severity: true } },
          brainFAQs:      { select: { id: true, question: true, answer: true } },
          brainDocuments: { select: { id: true, name: true, content: true } },
        },
      },
      lead: { select: { id: true, customData: true, conversations: { select: { channel: true } } } },
    },
  })

  if (!conversation) {
    return earlyExit("LLM_ERROR", "Conversation nicht gefunden")
  }

  const board = conversation.board
  const state = conversation.currentState
  const lead = conversation.lead

  if (!board || !state || !lead) {
    return earlyExit("LLM_ERROR", "Board, State oder Lead fehlt")
  }

  const brain = board.brain
  if (!brain) {
    return earlyExit("LLM_ERROR", "Board hat kein Brain konfiguriert")
  }

  // ── Step 2: Load History + Memory ─────────────────────────────────────────

  const historyRows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "asc" },
    take: 40,
    select: { direction: true, content: true },
  })

  const memory = await resolveMemory(conversationId)
  const memoryText = formatMemoryForPrompt(memory)
  const memoriesForPrompt = memoryText
    ? [{ key: "memory", value: memoryText }]
    : []

  // ── Step 3: Load Knowledge ─────────────────────────────────────────────────

  const knowledge: SubAgentKnowledge = {
    rules: board.brainRules     ?? [],
    faqs:  board.brainFAQs      ?? [],
    docs:  board.brainDocuments ?? [],
  }

  // ── Step 4: Build System Prompt ────────────────────────────────────────────

  const stateData = state as typeof state & {
    agentRole: string | null
    agentSystemPrompt: string | null
    agentGoal: string | null
    handoffMode: string
    dataToCollect: unknown
    availableTools: unknown
    escalateOnNoReply: number | null
  }

  const brainForPrompt: SubAgentBrain = {
    systemPrompt: brain.systemPrompt ?? "",
    stylePrompt:  brain.stylePrompt  ?? "",
    infoPrompt:   brain.infoPrompt   ?? "",
    rulePrompt:   brain.rulePrompt   ?? "",
    language:     brain.language     ?? "de",
    tone:         brain.tone         ?? "professional",
  }

  const leadChannels = lead.conversations.map((c) => c.channel)
  const customData = (lead.customData as Record<string, unknown>) ?? {}

  const promptInput: PromptBuilderInput = {
    agentRole:         stateData.agentRole,
    agentSystemPrompt: stateData.agentSystemPrompt,
    agentGoal:         stateData.agentGoal,
    handoffMode:       stateData.handoffMode ?? "HYBRID",
    stateName:         state.name,
    dataToCollect:     (stateData.dataToCollect as string[]) ?? [],
    brain:             brainForPrompt,
    knowledge,
    memories:          memoriesForPrompt,
    conversationSummary: conversation.conversationSummary ?? null,
    channel:           conversation.channel,
    leadChannels,
    customData,
    language:          brain.language ?? "de",
  }

  const systemPrompt = buildSubAgentSystemPrompt(promptInput)

  // ── Step 5: Prepare Tools ──────────────────────────────────────────────────

  const configuredTools = (stateData.availableTools as string[]) ?? []
  const toolNames = [...new Set([...configuredTools, ...ALWAYS_ON_TOOLS])]
  const toolDefs = getToolDefinitions(toolNames)

  // ── Step 6: Build Initial Messages ────────────────────────────────────────

  const messages: AIMessage[] = [{ role: "system", content: systemPrompt }]

  const recentHistory = historyRows.slice(-20)
  for (const msg of recentHistory) {
    messages.push({
      role:    msg.direction === "OUTBOUND" ? "assistant" : "user",
      content: msg.content,
    })
  }
  messages.push({ role: "user", content: userMessage })

  // ── Step 7: LLM Call + Tool Loop ──────────────────────────────────────────

  let finalContent: string | null = null
  let latestContent: string | null = null  // best text seen across all iterations
  type ContentStrategy = "natural" | "rescued" | "forced"
  let usedStrategy: ContentStrategy = "natural"
  let iterationsUsed = 0
  let handoffCalled = false
  let handoffReason: string | null = null
  let agentConfidence: number | null = null
  let suggestedTargetStateId: string | null = null
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCostCents = 0
  let usedModel = ""
  let usedProvider = ""
  const allToolCallsMade: Array<{ name: string; args: unknown }> = []
  const agentRunId = randomUUID()
  let outcome: AgentRunOutcome = "SUCCESS_CONTINUE"
  let errorMessage: string | undefined

  const conversationForTools = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })
  const boardForTools = await prisma.board.findUnique({ where: { id: boardId } })
  const stateForTools = await prisma.state.findUnique({ where: { id: state.id } })

  if (!conversationForTools || !boardForTools || !stateForTools) {
    return earlyExit("LLM_ERROR", "Konnte Entities für Tool-Execution nicht laden")
  }

  const toolContext = {
    conversationId,
    boardId,
    stateId: state.id,
    simulate: false,
    agentRunId,
  }

  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await aiRegistry.execute({
        boardId,
        purpose: "main",
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
        temperature: brain.temperature ?? 0.7,
        maxTokens: brain.maxTokens ?? 1024,
      })

      usedModel    = response.model    ?? usedModel
      usedProvider = response.provider ?? usedProvider
      totalInputTokens  += response.usage?.inputTokens  ?? 0
      totalOutputTokens += response.usage?.outputTokens ?? 0
      totalCostCents    += (response.providerCost ?? 0) * 100

      // ── Bug Fix: Write UsageLog immediately after every LLM call ──────────
      await prisma.usageLog.create({
        data: {
          boardId,
          conversationId,
          model:        response.model    ?? "unknown",
          provider:     response.provider ?? "unknown",
          inputTokens:  response.usage?.inputTokens  ?? 0,
          outputTokens: response.usage?.outputTokens ?? 0,
          totalTokens:  response.usage?.totalTokens  ?? 0,
          providerCost: response.providerCost ?? 0,
        },
      }).catch((e: unknown) => console.error("[AgentRuntime] UsageLog write failed:", e))

      iterationsUsed = iteration + 1
      if (response.content?.trim()) latestContent = response.content

      // No tool calls → natural completion
      if (!response.toolCalls?.length) {
        finalContent = response.content ?? null
        usedStrategy = "natural"
        break
      }

      // Execute tools
      const executed = await executeToolCalls({
        toolCalls:    response.toolCalls,
        conversation: conversationForTools,
        board:        boardForTools,
        state:        stateForTools,
        context:      toolContext,
      })

      for (const ex of executed) {
        const execArgs = response.toolCalls.find((tc) => tc.name === ex.toolName)?.arguments
        allToolCallsMade.push({ name: ex.toolName, args: execArgs ?? {} })

        // Detect handoff_proposed signal
        if (ex.toolName === "handoff_proposed" && ex.result.success) {
          handoffCalled = true
          const raw = ex.result.data as Record<string, unknown> | undefined
          // Args are passed through result.data by convention; also read from toolCall args
          const callArgs = response.toolCalls.find((tc) => tc.name === "handoff_proposed")?.arguments
          handoffReason         = (callArgs?.reason as string)              ?? null
          agentConfidence       = (callArgs?.confidence as number)           ?? null
          suggestedTargetStateId = (callArgs?.suggestedTargetStateId as string) ?? null
          void raw // acknowledged field is only a signal
        }

        if (ex.toolName === "escalate_to_human" && ex.result.success) {
          outcome = "ESCALATED"
        }
      }

      // Append assistant turn + tool results to messages for next iteration
      if (response.content) {
        messages.push({ role: "assistant", content: response.content })
      }
      for (const ex of executed) {
        messages.push({ role: "tool", content: ex.resultText, tool_call_id: ex.tool_call_id })
      }

      // If handoff was proposed, one more pass so the agent can say goodbye
      if (handoffCalled && iteration === 0) continue

      // Stop looping if escalated or handoff proposed — rescue latest text before exit
      if (handoffCalled || outcome === "ESCALATED") {
        if (!finalContent && latestContent) {
          finalContent = latestContent
          usedStrategy = "rescued"
        }
        break
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
    outcome = "LLM_ERROR"
    console.error("[AgentRuntime] LLM-Fehler:", errorMessage)
  }

  // Post-loop rescue: if loop exhausted without break and latestContent exists
  if (!finalContent && latestContent && outcome !== "LLM_ERROR") {
    finalContent = latestContent
    usedStrategy = "rescued"
  }

  // ── Step 7b: Forced Final Iteration if Still No Content ───────────────────

  if (!finalContent && outcome !== "LLM_ERROR") {
    console.log("[AgentRuntime] No content from main loop — forcing final iteration without tools")
    try {
      const forced = await aiRegistry.execute({
        boardId,
        purpose: "main",
        messages: [
          ...messages,
          { role: "system" as const, content: "Gib jetzt deine abschließende Antwort an den User. Rufe keine Tools auf." },
        ],
        tools: undefined,
        temperature: brain.temperature ?? 0.7,
        maxTokens: brain.maxTokens ?? 1024,
      })
      totalInputTokens  += forced.usage?.inputTokens  ?? 0
      totalOutputTokens += forced.usage?.outputTokens ?? 0
      totalCostCents    += (forced.providerCost ?? 0) * 100
      await prisma.usageLog.create({
        data: {
          boardId,
          conversationId,
          model:        forced.model    ?? usedModel    ?? "unknown",
          provider:     forced.provider ?? usedProvider ?? "unknown",
          inputTokens:  forced.usage?.inputTokens  ?? 0,
          outputTokens: forced.usage?.outputTokens ?? 0,
          totalTokens:  forced.usage?.totalTokens  ?? 0,
          providerCost: forced.providerCost ?? 0,
        },
      }).catch((e: unknown) => console.error("[AgentRuntime] UsageLog forced write failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))
      if (forced.content?.trim()) {
        finalContent = forced.content
        usedStrategy = "forced"
        iterationsUsed += 1
      }
    } catch (e: unknown) {
      console.error("[AgentRuntime] Forced iteration fehlgeschlagen:", e)
    }
  }

  // ── Step 8: Sanitize Output ────────────────────────────────────────────────

  const cleanedText = finalContent ? sanitizeAIOutput(finalContent) : null

  // ── Step 9: Evaluate Handoff via Handoff Engine ───────────────────────────

  let transitioned = false
  let resolvedTargetStateId: string | null = null
  let ruleEvaluation: Record<string, unknown> | null = null

  if (outcome !== "ESCALATED" && outcome !== "LLM_ERROR") {
    const mode = (stateData.handoffMode ?? "HYBRID") as import("@prisma/client").HandoffMode
    const rawRules = stateData.handoffRules as unknown
    const minConfidence = stateData.minAgentConfidence ?? 0.7

    // Load context for rule evaluation (only hits DB when needed)
    const needsRules =
      mode === "RULE_ONLY" || (mode === "HYBRID" && handoffCalled)
    const hCtx = needsRules ? await loadHandoffContext(conversationId) : null

    const rulesEval = hCtx
      ? evaluateHandoffRules(rawRules, hCtx)
      : { allPassed: true, passedCount: 0, totalCount: 0, results: [] }

    ruleEvaluation = rulesEval.totalCount > 0
      ? { allPassed: rulesEval.allPassed, passedCount: rulesEval.passedCount, totalCount: rulesEval.totalCount, results: rulesEval.results.map((r) => ({ rule: r.rule, passed: r.passed, reason: r.reason })) }
      : null

    const decision = decideHandoff({
      mode,
      agentProposed:   handoffCalled,
      agentConfidence,
      minConfidence,
      rulesEval,
    })

    if (decision.approved) {
      const targetId = suggestedTargetStateId ?? (state as typeof state & { nextStateId: string | null }).nextStateId
      if (targetId) {
        try {
          await transitionState(conversationId, targetId, "ai_advance")
          transitioned = true
          resolvedTargetStateId = targetId
          outcome = "SUCCESS_HANDOFF"
        } catch (err) {
          console.error("[AgentRuntime] Transition fehlgeschlagen:", err)
          outcome = "HANDOFF_BLOCKED"
        }
      } else {
        // RULE_ONLY mode may approve even without an agent proposal; only block if no target
        outcome = handoffCalled ? "HANDOFF_BLOCKED" : "SUCCESS_CONTINUE"
      }
    } else if (handoffCalled) {
      outcome = "HANDOFF_BLOCKED"
    }
  }

  // ── Step 10: Persist AgentRun ──────────────────────────────────────────────

  const latencyMs = Date.now() - runStart

  await prisma.agentRun.create({
    data: {
      id:               agentRunId,
      conversationId,
      leadId:           lead.id,
      stateId:          state.id,
      boardId,
      systemPromptUsed: systemPrompt,
      userMessageInput: userMessage,
      contextMessages:  JSON.parse(JSON.stringify(messages.slice(1, -1))),
      model:            usedModel    || "unknown",
      provider:         usedProvider || "unknown",
      inputTokens:      totalInputTokens,
      outputTokens:     totalOutputTokens,
      totalTokens:      totalInputTokens + totalOutputTokens,
      costCents:        totalCostCents,
      latencyMs,
      agentResponse:    cleanedText,
      toolCallsMade:    JSON.parse(JSON.stringify(allToolCallsMade)),
      handoffProposed:  handoffCalled,
      handoffReason,
      agentConfidence,
      rulesPassed:      transitioned ? true : handoffCalled ? false : null,
      ruleEvaluation:   ruleEvaluation ? JSON.parse(JSON.stringify(ruleEvaluation)) : undefined,
      targetStateId:    resolvedTargetStateId,
      outcome,
      errorMessage:     errorMessage ?? null,
    },
  }).catch((e: unknown) => console.error("[AgentRuntime] AgentRun-Persistierung fehlgeschlagen:", e))

  console.log(`[AgentRuntime] contentStrategy=${usedStrategy} iterations=${iterationsUsed} hasResponse=${!!cleanedText}`)

  // ── Step 11: Send Message ──────────────────────────────────────────────────

  if (cleanedText && outcome !== "LLM_ERROR") {
    await prisma.message.create({
      data: {
        conversationId,
        direction:   "OUTBOUND",
        content:     cleanedText,
        messageType: "TEXT",
        status:      "SENT",
        aiGenerated: true,
      },
    }).catch((e: unknown) => console.error("[AgentRuntime] Outbound message persistence failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))

    await sendAIResponse(conversationId, cleanedText).catch((e: unknown) =>
      console.error("[AgentRuntime] Nachricht senden fehlgeschlagen:", e),
    )

    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { lastMessageAt: new Date() },
    }).catch((e: unknown) => console.error("[AgentRuntime] Conversation lastMessageAt update failed:", { conversationId, error: e instanceof Error ? e.message : String(e) }))
  }

  // ── Step 12: Update Memory ─────────────────────────────────────────────────

  if (userMessage && outcome !== "LLM_ERROR") {
    extractMemory(conversationId, userMessage, boardId)
      .then(async (extracted) => {
        for (const [k, v] of Object.entries(extracted.facts)) {
          await appendFact(conversationId, k, v)
        }
        await updateMemory(conversationId, {
          temporary: {
            lastIntent:           extracted.intent,
            lastIntentConfidence: extracted.confidence,
            lastExtractedEntities: extracted.facts,
            escalationReason:     outcome === "ESCALATED" ? "agent_requested" : null,
            lowConfidence:        (extracted.confidence ?? 0) < 0.4,
          },
        })
      })
      .catch((e: unknown) => console.error("[AgentRuntime] Memory-Update fehlgeschlagen:", e))
  }

  // ── Step 13: Reactive Supervisor Trigger ──────────────────────────────────

  import("@/lib/supervisor/triggers/reactive")
    .then(({ checkReactiveTriggers }) =>
      checkReactiveTriggers({
        id:             "pending",
        conversationId,
        boardId,
        leadId:         lead.id,
        stateId:        state.id,
        outcome:        outcome as string,
      }),
    )
    .catch((e: unknown) => console.error("[AgentRuntime] Reactive trigger check fehlgeschlagen:", e))

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    responseText:    cleanedText,
    action:          deriveAction(outcome, transitioned),
    targetStateId:   resolvedTargetStateId,
    handoffProposed: handoffCalled,
    agentConfidence,
    outcome,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function earlyExit(outcome: AgentRunOutcome, reason: string): SubAgentRunResult {
  console.error(`[AgentRuntime] Early exit (${outcome}): ${reason}`)
  return {
    responseText:    null,
    action:          "wait",
    targetStateId:   null,
    handoffProposed: false,
    agentConfidence: null,
    outcome,
  }
}

function deriveAction(
  outcome: AgentRunOutcome,
  transitioned: boolean,
): SubAgentRunResult["action"] {
  if (outcome === "ESCALATED") return "escalate"
  if (transitioned || outcome === "SUCCESS_HANDOFF") return "transition"
  if (outcome === "LLM_ERROR") return "wait"
  return "respond"
}
