import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const updateLeadDataTool: Tool = {
  name: "update_lead_data",
  description:
    "Speichert strukturierte Daten über den Lead (z.B. Alter, PLZ, Vorerkrankungen). Nutze dieses Tool sobald der Kunde einen Wert nennt der zu einem der definierten Felder passt.",
  parameters: {
    type: "object",
    properties: {
      fields: {
        type: "object",
        description:
          "Key-Value-Paare: Feldschlüssel (wie im Board definiert) → extrahierter Wert. Nur Felder eintragen die der Kunde tatsächlich genannt hat.",
      },
    },
    required: ["fields"],
  },

  async execute({
    args,
    conversation,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const fields = args.fields as Record<string, string> | undefined
    if (!fields || typeof fields !== "object") {
      return { success: false, error: "fields muss ein Objekt sein" }
    }

    if (context.simulate) {
      return { success: true, data: { stored: Object.keys(fields) } }
    }

    try {
      const existing = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        select: { customData: true, collectedFields: true },
      })

      const customData = ((existing?.customData ?? {}) as Record<string, unknown>)
      const collectedFields = ((existing?.collectedFields ?? []) as string[])

      for (const [key, value] of Object.entries(fields)) {
        customData[key] = value
        // Also upsert into ConversationMemory for history
        await prisma.conversationMemory.upsert({
          where: { conversationId_key: { conversationId: conversation.id, key } },
          update: { value: String(value) },
          create: { conversationId: conversation.id, key, value: String(value) },
        })
        if (!collectedFields.includes(key)) collectedFields.push(key)
      }

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { customData: customData as never, collectedFields: collectedFields as never },
      })

      return { success: true, data: { stored: Object.keys(fields) } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
