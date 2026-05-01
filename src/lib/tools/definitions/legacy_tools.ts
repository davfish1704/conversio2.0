// Thin adapters that expose the existing tool-engine primitives through the new registry.
// These let existing boards with no availableTools config continue to use change_state,
// send_text, store_memory, get_history by listing them explicitly.

import { executeChangeState, executeSendText, executeStoreMemory, executeGetHistory } from "@/lib/ai/tools"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

function makeCtx(conversation: Conversation, board: Board, context: ToolExecutionContext) {
  return {
    conversationId: conversation.id,
    boardId: board.id,
    waAccountId: (conversation as { waAccountId?: string }).waAccountId ?? "",
    customerPhone: conversation.customerPhone,
    channel: conversation.channel,
    simulate: context.simulate,
    sentMessages: [] as string[],
    stateTransitions: [] as string[],
    dataToCollect: [] as string[],
  }
}

async function wrap(fn: () => Promise<string>): Promise<ToolResult> {
  try {
    const msg = await fn()
    return { success: !msg.startsWith("FEHLER"), data: msg, error: msg.startsWith("FEHLER") ? msg : undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
  }
}

export const changStateLegacyTool: Tool = {
  name: "change_state",
  description: "Wechselt den State per State-ID (Legacy). Bevorzuge advance_state wenn möglich.",
  parameters: {
    type: "object",
    properties: { stateId: { type: "string" } },
    required: ["stateId"],
  },
  async execute({ args, conversation, board, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    return wrap(() => executeChangeState(args as { stateId: string }, makeCtx(conversation, board, context)))
  },
}

export const sendTextLegacyTool: Tool = {
  name: "send_text",
  description: "Sendet eine Textnachricht an den Lead.",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  async execute({ args, conversation, board, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    return wrap(() => executeSendText(args as { text: string }, makeCtx(conversation, board, context)))
  },
}

export const storeMemoryLegacyTool: Tool = {
  name: "store_memory",
  description: "Speichert einen Fakt persistent (Legacy). Bevorzuge update_lead_data für strukturierte Felder.",
  parameters: {
    type: "object",
    properties: { key: { type: "string" }, value: { type: "string" } },
    required: ["key", "value"],
  },
  async execute({ args, conversation, board, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    return wrap(() => executeStoreMemory(args as { key: string; value: string }, makeCtx(conversation, board, context)))
  },
}

export const getHistoryLegacyTool: Tool = {
  name: "get_history",
  description: "Lädt ältere Nachrichten aus dem Verlauf.",
  parameters: {
    type: "object",
    properties: { limit: { type: "number" } },
    required: [],
  },
  async execute({ args, conversation, board, context }: { args: Record<string, unknown>; conversation: Conversation; board: Board; state: State; context: ToolExecutionContext }): Promise<ToolResult> {
    return wrap(() => executeGetHistory(args as { limit?: number }, makeCtx(conversation, board, context)))
  },
}
