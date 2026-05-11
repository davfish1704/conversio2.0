import { prisma } from "@/lib/db"
import type { ConversationMemory } from "./schema"
import { EMPTY_MEMORY } from "./schema"

const MEMORY_KEY = "__structured_memory"

export async function resolveMemory(
  conversationId: string,
): Promise<ConversationMemory> {
  const conversation = await prisma.conversation
    .findUnique({
      where: { id: conversationId },
      select: { leadId: true },
    })
    .catch(() => null)

  if (!conversation?.leadId) return EMPTY_MEMORY

  const row = await (prisma as any)
    .leadMemory.findUnique({
      where: { leadId_key: { leadId: conversation.leadId, key: MEMORY_KEY } },
      select: { value: true },
    })
    .catch(() => null)

  if (row?.value) {
    try {
      return JSON.parse(row.value) as ConversationMemory
    } catch {}
  }

  return EMPTY_MEMORY
}

export function formatMemoryForPrompt(memory: ConversationMemory): string {
  const parts: string[] = []

  if (memory.global.customerName) {
    parts.push(`Customer: ${memory.global.customerName}`)
  }
  if (memory.global.customerType !== "unknown") {
    parts.push(`Customer type: ${memory.global.customerType}`)
  }

  const fields = Object.entries(memory.state.collectedFields)
  if (fields.length > 0) {
    parts.push(
      `Known information: ${fields.map(([k, v]) => `${k}: ${v}`).join(", ")}`,
    )
  }

  if (memory.temporary.lastIntent && memory.temporary.lastIntentConfidence > 0.5) {
    parts.push(`Last detected intent: ${memory.temporary.lastIntent}`)
  }

  return parts.length > 0 ? `## Structured Memory\n${parts.join("\n")}` : ""
}
