import { prisma } from "@/lib/db"
import type { ConversationMemory, GlobalMemory, StateMemory, TemporaryMemory } from "./schema"
import { EMPTY_GLOBAL_MEMORY, EMPTY_STATE_MEMORY, EMPTY_TEMPORARY_MEMORY } from "./schema"

const MEMORY_KEY = "__structured_memory"

export async function updateMemory(
  conversationId: string,
  updates: Partial<ConversationMemory>,
): Promise<void> {
  const leadId = await prisma.conversation
    .findUnique({
      where: { id: conversationId },
      select: { leadId: true },
    })
    .then((c) => c?.leadId)

  if (!leadId) return

  const existingRaw = await (prisma as any).leadMemory
    .findUnique({
      where: { leadId_key: { leadId, key: MEMORY_KEY } },
      select: { value: true },
    })
    .catch(() => null)

  let existing: ConversationMemory
  try {
    existing = existingRaw?.value
      ? JSON.parse(existingRaw.value)
      : { global: { ...EMPTY_GLOBAL_MEMORY }, state: { ...EMPTY_STATE_MEMORY }, temporary: { ...EMPTY_TEMPORARY_MEMORY } }
  } catch {
    existing = { global: { ...EMPTY_GLOBAL_MEMORY }, state: { ...EMPTY_STATE_MEMORY }, temporary: { ...EMPTY_TEMPORARY_MEMORY } }
  }

  const merged = deepMerge(existing as unknown as Record<string, unknown>, updates as unknown as Record<string, unknown>) as unknown as ConversationMemory

  await (prisma as any).leadMemory
    .upsert({
      where: { leadId_key: { leadId, key: MEMORY_KEY } },
      update: { value: JSON.stringify(merged) },
      create: { leadId, key: MEMORY_KEY, value: JSON.stringify(merged) },
    })
    .catch(() => {})
}

export async function appendFact(
  conversationId: string,
  key: string,
  value: string,
): Promise<void> {
  const leadId = await prisma.conversation
    .findUnique({
      where: { id: conversationId },
      select: { leadId: true },
    })
    .then((c) => c?.leadId)

  if (!leadId) return

  await (prisma as any).leadMemory
    .upsert({
      where: { leadId_key: { leadId, key } },
      update: { value },
      create: { leadId, key, value },
    })
    .catch(() => {})

  const lead = await (prisma as any).lead
    .findUnique({
      where: { id: leadId },
      select: { customData: true },
    })
    .catch(() => null)

  if (lead) {
    const customData = (lead.customData ?? {}) as Record<string, unknown>
    customData[key] = value
    await (prisma as any).lead
      .update({
        where: { id: leadId },
        data: { customData },
      })
      .catch(() => {})
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const val = source[key]
    if (val !== undefined && typeof val === "object" && !Array.isArray(val) && val !== null) {
      result[key] = deepMerge(
        (target[key] as Record<string, unknown>) ?? {},
        val as Record<string, unknown>,
      )
    } else if (val !== undefined) {
      result[key] = val
    }
  }
  return result
}
