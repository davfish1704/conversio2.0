// Legacy primitive tools — change_state, send_text, store_memory, get_history.
// Logic was previously in src/lib/ai/tools.ts (now deleted). These adapters let
// existing boards that list these tool names in availableTools continue to work.

import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"
import { sendMessage as dispatchMessage } from "@/lib/messaging/dispatcher"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

interface LegacyCtx {
  conversationId: string
  boardId: string
  simulate: boolean
}

// ── change_state ─────────────────────────────────────────────────────────────

export const changStateLegacyTool: Tool = {
  name: "change_state",
  description: "Wechselt den State per State-ID (Legacy). Bevorzuge advance_state wenn möglich.",
  parameters: {
    type: "object",
    properties: { stateId: { type: "string" } },
    required: ["stateId"],
  },
  async execute({ args, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    const stateId = args.stateId as string
    try {
      const target = await prisma.state.findFirst({
        where: { id: stateId, boardId: context.boardId },
        select: { id: true, name: true },
      })
      if (!target) {
        return { success: false, error: `State nicht gefunden oder gehört nicht zu diesem Board (stateId: ${stateId})` }
      }
      if (context.simulate) {
        return { success: true, data: `State-Wechsel simuliert → '${target.name}'` }
      }
      await transitionState(context.conversationId, stateId)
      return { success: true, data: { targetState: target.name } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}

// ── send_text ─────────────────────────────────────────────────────────────────

export const sendTextLegacyTool: Tool = {
  name: "send_text",
  description: "Sendet eine Textnachricht an den Lead.",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  async execute({ args, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    const text = args.text as string
    if (!text?.trim()) {
      return { success: false, error: "Nachrichtentext darf nicht leer sein" }
    }
    if (context.simulate) {
      return { success: true, data: { preview: text.slice(0, 80) } }
    }
    try {
      await prisma.message.create({
        data: {
          conversationId: context.conversationId,
          direction: "OUTBOUND",
          content: text,
          messageType: "TEXT",
          status: "SENT",
          aiGenerated: true,
        },
      })
      await prisma.conversation.update({
        where: { id: context.conversationId },
        data: { lastMessageAt: new Date() },
      })
      const dispatch = await dispatchMessage(context.conversationId, text)
      if (!dispatch.ok) {
        return { success: false, error: `Versand fehlgeschlagen — ${dispatch.error}` }
      }
      return { success: true, data: { length: text.length } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}

// ── store_memory ──────────────────────────────────────────────────────────────

export const storeMemoryLegacyTool: Tool = {
  name: "store_memory",
  description: "Speichert einen Fakt persistent (Legacy). Bevorzuge update_lead_data für strukturierte Felder.",
  parameters: {
    type: "object",
    properties: { key: { type: "string" }, value: { type: "string" } },
    required: ["key", "value"],
  },
  async execute({ args, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    const key = args.key as string
    const value = args.value as string
    if (!key?.trim() || !value?.trim()) {
      return { success: false, error: "key und value dürfen nicht leer sein" }
    }
    if (context.simulate) {
      return { success: true, data: { stored: `${key} = ${value}` } }
    }
    try {
      const conv = await (prisma as any).conversation.findUnique({
        where: { id: context.conversationId },
        select: { leadId: true },
      })
      if (!conv?.leadId) {
        return { success: false, error: "Lead für diese Conversation nicht gefunden" }
      }
      await (prisma as any).leadMemory.upsert({
        where: { leadId_key: { leadId: conv.leadId, key } },
        update: { value },
        create: { leadId: conv.leadId, key, value },
      })
      const lead = await (prisma as any).lead.findUnique({
        where: { id: conv.leadId },
        select: { customData: true },
      })
      const customData = ((lead?.customData ?? {}) as Record<string, unknown>)
      customData[key] = value
      await (prisma as any).lead.update({
        where: { id: conv.leadId },
        data: { customData },
      })
      return { success: true, data: { key, value } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}

// ── get_history ───────────────────────────────────────────────────────────────

export const getHistoryLegacyTool: Tool = {
  name: "get_history",
  description: "Lädt ältere Nachrichten aus dem Verlauf.",
  parameters: {
    type: "object",
    properties: { limit: { type: "number" } },
    required: [],
  },
  async execute({ args, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    if (context.simulate) {
      return { success: true, data: { messages: [] } }
    }
    try {
      const limit = Math.min((args.limit as number | undefined) ?? 10, 20)
      const messages = await prisma.message.findMany({
        where: { conversationId: context.conversationId },
        orderBy: { timestamp: "desc" },
        take: limit,
        select: { direction: true, content: true, timestamp: true },
      })
      const formatted = messages
        .reverse()
        .map((m) => {
          const role = m.direction === "OUTBOUND" ? "Agent" : "Kunde"
          const time = m.timestamp.toISOString().slice(11, 16)
          return `[${time}] ${role}: ${m.content}`
        })
      return { success: true, data: { messages: formatted } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
