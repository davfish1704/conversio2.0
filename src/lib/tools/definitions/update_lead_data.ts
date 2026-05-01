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
      // Hole leadId aus Conversation
      const conv = await (prisma as any).conversation.findUnique({
        where: { id: conversation.id },
        select: { leadId: true },
      })

      const leadId = conv?.leadId
      if (!leadId) {
        return { success: false, error: "Lead für diese Conversation nicht gefunden" }
      }

      const lead = await (prisma as any).lead.findUnique({
        where: { id: leadId },
        select: { customData: true },
      })

      const customData = ((lead?.customData ?? {}) as Record<string, unknown>)

      for (const [key, value] of Object.entries(fields)) {
        customData[key] = value
        // Upsert into LeadMemory for history
        await (prisma as any).leadMemory.upsert({
          where: { leadId_key: { leadId, key } },
          update: { value: String(value) },
          create: { leadId, key, value: String(value) },
        })
      }

      await (prisma as any).lead.update({
        where: { id: leadId },
        data: { customData: customData },
      })

      return { success: true, data: { stored: Object.keys(fields) } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
