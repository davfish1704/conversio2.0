import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"
import type { QualificationField } from "@/lib/types"

export const updateQualificationTool: Tool = {
  name: "update_qualification",
  description:
    "Speichert einen Qualification-Slot für den Lead (z.B. Budget, Timeline, Kaufabsicht). " +
    "Ruf dieses Tool auf, sobald der Lead einen Wert für eines der definierten Qualification-Felder nennt. " +
    "Ein Tool-Call pro Feld. Frag NUR nach noch leeren Pflichtfeldern — nie nach bereits gefüllten.",
  parameters: {
    type: "object",
    properties: {
      fieldKey: {
        type: "string",
        description:
          "Der camelCase-Schlüssel des Qualification-Felds, exakt wie in den Qualification-Slots angegeben.",
      },
      value: {
        type: "string",
        description:
          "Der vom Lead genannte Wert als String. Zahlen (z.B. '5000'), Enums (z.B. 'sofort'), Booleans ('ja'/'nein').",
      },
    },
    required: ["fieldKey", "value"],
  },

  async execute({
    args,
    conversation,
    board,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const fieldKey = args.fieldKey as string | undefined
    const rawValue = args.value as string | undefined

    if (!fieldKey || rawValue === undefined || rawValue === "") {
      return { success: false, error: "fieldKey und value sind erforderlich" }
    }

    const fieldDefs = (board.boardCustomFields as unknown as QualificationField[]) ?? []
    const fieldDef = fieldDefs.find((f) => f.key === fieldKey)

    if (!fieldDef) {
      return {
        success: false,
        error: `Feld "${fieldKey}" nicht definiert. Verfügbare Felder: ${fieldDefs.map((f) => f.key).join(", ")}`,
      }
    }

    // ── Type validation ────────────────────────────────────────────────────────

    let storedValue: string | number | boolean = rawValue

    if (fieldDef.type === "number") {
      const num = Number(rawValue.replace(/[^0-9.,\-]/g, "").replace(",", "."))
      if (isNaN(num)) {
        return {
          success: false,
          error: `Feld "${fieldKey}" erwartet eine Zahl (z.B. "5000"), erhalten: "${rawValue}"`,
        }
      }
      storedValue = num
    } else if (fieldDef.type === "boolean") {
      const lower = rawValue.toLowerCase().trim()
      if (["true", "ja", "yes", "1", "wahr"].includes(lower)) {
        storedValue = true
      } else if (["false", "nein", "no", "0", "falsch"].includes(lower)) {
        storedValue = false
      } else {
        return {
          success: false,
          error: `Feld "${fieldKey}" erwartet ja/nein, erhalten: "${rawValue}"`,
        }
      }
    } else if (fieldDef.type === "enum" && fieldDef.options?.length) {
      const match = fieldDef.options.find(
        (o) => o.toLowerCase() === rawValue.toLowerCase().trim(),
      )
      if (!match) {
        return {
          success: false,
          error: `"${rawValue}" ungültig für "${fieldKey}". Erlaubt: ${fieldDef.options.join(", ")}`,
        }
      }
      storedValue = match
    }

    if (context.simulate) {
      return { success: true, data: { fieldKey, value: storedValue } }
    }

    // ── Persist ────────────────────────────────────────────────────────────────

    try {
      const conv = await (prisma as any).conversation.findUnique({
        where: { id: conversation.id },
        select: { leadId: true },
      })
      const leadId = conv?.leadId
      if (!leadId) return { success: false, error: "Lead nicht gefunden" }

      const lead = await (prisma as any).lead.findUnique({
        where: { id: leadId },
        select: { customData: true },
      })
      const customData = { ...((lead?.customData ?? {}) as Record<string, unknown>) }
      customData[fieldKey] = storedValue

      await (prisma as any).lead.update({ where: { id: leadId }, data: { customData } })

      await (prisma as any).leadMemory.upsert({
        where: { leadId_key: { leadId, key: fieldKey } },
        update: { value: String(storedValue) },
        create: { leadId, key: fieldKey, value: String(storedValue) },
      })

      // ── Auto-score: required-completion-ratio × 10 ────────────────────────

      const requiredFields = fieldDefs.filter((f) => f.required)
      const filledRequired = requiredFields.filter((f) => {
        const v = customData[f.key]
        return v !== undefined && v !== null && v !== ""
      })
      const allRequiredFilled =
        requiredFields.length > 0 && filledRequired.length === requiredFields.length

      if (requiredFields.length > 0) {
        const newScore = Math.round((filledRequired.length / requiredFields.length) * 10)
        await (prisma as any).lead.update({ where: { id: leadId }, data: { leadScore: newScore } })
        return {
          success: true,
          data: { fieldKey, value: storedValue, allRequiredFilled, score: newScore },
        }
      }

      return { success: true, data: { fieldKey, value: storedValue, allRequiredFilled } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
