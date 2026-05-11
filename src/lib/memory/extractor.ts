import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import { extractStructuredJSON } from "@/lib/ai/json/retry"
import { MEMORY_EXTRACTION_RULES } from "@/lib/ai/json/validator"
import type { ConversationMemory, GlobalMemory, StateMemory } from "./schema"
import { EMPTY_MEMORY } from "./schema"

const EXTRACTION_SYSTEM_PROMPT = `Extract structured information from the user message. Respond with valid JSON only, no markdown, no extra text.

Required schema:
{
  "intent": "string - the user's primary intent (e.g. 'booking_inquiry', 'support_request', 'checkout_request', 'information', 'complaint', 'general')",
  "confidence": "number 0-1 - your confidence in the intent classification",
  "customer_type": "lead | tenant | owner | unknown",
  "facts": { "key": "value pairs of any factual information disclosed" },
  "action_needed": "respond | transition | escalate | wait"
}`

export async function extractMemory(
  conversationId: string,
  userMessage: string,
  boardId: string,
): Promise<{
  intent: string
  confidence: number
  facts: Record<string, string>
  actionNeeded: string
  customerType: string
}> {
  try {
    const result = await extractStructuredJSON<{
      intent: string
      confidence: number
      customer_type: string
      facts: Record<string, string>
      action_needed: string
    }>(
      EXTRACTION_SYSTEM_PROMPT,
      `Extract information from: "${userMessage}"`,
      MEMORY_EXTRACTION_RULES,
      { boardId, temperature: 0, maxTokens: 200 },
    )

    if (result.data) {
      return {
        intent: result.data.intent || "general",
        confidence: result.data.confidence ?? 0.5,
        facts: result.data.facts || {},
        actionNeeded: result.data.action_needed || "respond",
        customerType: result.data.customer_type || "unknown",
      }
    }
  } catch {}

  return {
    intent: "general",
    confidence: 0,
    facts: {},
    actionNeeded: "respond",
    customerType: "unknown",
  }
}

export async function loadConversationMemory(
  conversationId: string,
): Promise<ConversationMemory> {
  const conversation = await (prisma as any).conversation.findUnique({
    where: { id: conversationId },
    select: {
      leadId: true,
      channel: true,
      currentStateId: true,
    },
  })

  if (!conversation) return EMPTY_MEMORY

  const lead = conversation.leadId
    ? await (prisma as any).lead.findUnique({
        where: { id: conversation.leadId },
        select: {
          name: true,
          phone: true,
          email: true,
          channel: true,
          customData: true,
          currentStateId: true,
        },
      })
    : null

  let global: GlobalMemory = {
    language: "en",
    customerType: "unknown",
    customerName: lead?.name ?? null,
    phone: lead?.phone ?? null,
    email: lead?.email ?? null,
    preferredChannel: lead?.channel ?? conversation.channel ?? null,
  }

  const currentState = conversation.currentStateId
    ? await prisma.state.findUnique({
        where: { id: conversation.currentStateId },
        select: { name: true },
      })
    : null

  const state: StateMemory = {
    currentStateId: conversation.currentStateId,
    currentStateName: currentState?.name ?? null,
    dataCollectionProgress: {},
    collectedFields: lead?.customData ? Object.fromEntries(
      Object.entries(lead.customData as Record<string, unknown>).map(([k, v]) => [k, String(v)])
    ) : {},
    lastTransitionAt: null,
    previousStateName: null,
  }

  return {
    global,
    state,
    temporary: {
      lastIntent: null,
      lastIntentConfidence: 0,
      lastExtractedEntities: {},
      escalationReason: null,
      lowConfidence: false,
    },
  }
}
