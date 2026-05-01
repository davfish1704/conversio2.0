// src/lib/ai/tools.ts
// Tool-Definitionen und Executor-Funktionen für die AI Agent Engine (Sprint 4)
//
// sendViaWhatsApp ist eine lokale Kopie von agent.ts:sendWhatsAppMessage (private dort).
// Konsolidierung zu einem shared Helper erfolgt in Schritt 5 (agent.ts Integration).

import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"
import { sendMessage as dispatchMessage } from "@/lib/messaging/dispatcher"
import type { ToolDefinition } from "@/lib/ai/providers/types"

// ── ToolContext ───────────────────────────────────────────────────────────────

export interface ToolContext {
  conversationId: string
  boardId: string
  waAccountId: string
  customerPhone: string
  channel: string
  simulate: boolean
  sentMessages: string[]      // Engine initialisiert; send_text/send_asset pushen hier rein (simulate)
  stateTransitions: string[]  // Engine initialisiert; change_state pusht hier rein (simulate)
  dataToCollect: string[]     // Felder die dieser State sammeln soll (für collectedFields-Tracking)
}

// ── Tool-Definitionen (JSON Schema) ──────────────────────────────────────────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "change_state",
    description:
      "Wechselt den aktuellen Funnel-State der Konversation. Nutze dieses Tool wenn der Kunde bereit für den nächsten Schritt ist.",
    parameters: {
      type: "object",
      properties: {
        stateId: {
          type: "string",
          description: "Die ID des Ziel-States (muss zu diesem Board gehören)",
        },
      },
      required: ["stateId"],
    },
  },
  {
    name: "send_text",
    description: "Sendet eine Textnachricht an den Kunden.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Der Nachrichtentext (max. 4096 Zeichen)",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "send_asset",
    description:
      "Sendet ein Board-Asset (Dokument, Bild, Text-Snippet) an den Kunden. Verwende search_assets um gültige Asset-IDs zu finden.",
    parameters: {
      type: "object",
      properties: {
        assetId: {
          type: "string",
          description: "Die ID des BoardAssets",
        },
      },
      required: ["assetId"],
    },
  },
  {
    name: "search_assets",
    description:
      "Sucht nach Board-Assets anhand von Stichwörtern. Gibt Asset-IDs und Namen zurück die für send_asset genutzt werden können.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Suchbegriff für Asset-Name oder Tags",
        },
        type: {
          type: "string",
          enum: ["AUDIO_MEMO", "PDF_DOC", "IMAGE_ASSET", "TEXT_SNIPPET", "TEMPLATE", "KNOWLEDGE_BASE"],
          description: "Optionaler Filter nach Asset-Typ",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "store_memory",
    description:
      "Speichert einen wichtigen Fakt über den Kunden persistent (z.B. Name, Produktwunsch, Budget). Wird in nachfolgenden Gesprächen wieder geladen.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Schlüssel des Fakts (z.B. 'customer_name', 'interested_product', 'budget')",
        },
        value: {
          type: "string",
          description: "Wert des zu speichernden Fakts",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "get_history",
    description:
      "Lädt ältere Nachrichten aus dem Gesprächsverlauf über die zuletzt geladenen 10 hinaus.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Anzahl der Nachrichten (Standard: 10, Maximum: 20)",
        },
      },
      required: [],
    },
  },
]

// ── Executor-Funktionen ───────────────────────────────────────────────────────

export async function executeChangeState(
  args: { stateId: string },
  ctx: ToolContext
): Promise<string> {
  try {
    // Sicherheits-Check: stateId muss zum boardId gehören
    const state = await prisma.state.findFirst({
      where: { id: args.stateId, boardId: ctx.boardId },
      select: { id: true, name: true },
    })

    if (!state) {
      return `FEHLER: State nicht gefunden oder gehört nicht zu diesem Board (stateId: ${args.stateId})`
    }

    if (ctx.simulate) {
      ctx.stateTransitions.push(args.stateId)
      return `OK: State-Wechsel simuliert → '${state.name}'`
    }

    await transitionState(ctx.conversationId, args.stateId)
    return `OK: State gewechselt → '${state.name}'`
  } catch (error) {
    return `FEHLER: State-Wechsel fehlgeschlagen — ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
  }
}

export async function executeSendText(
  args: { text: string },
  ctx: ToolContext
): Promise<string> {
  if (!args.text?.trim()) {
    return "FEHLER: Nachrichtentext darf nicht leer sein"
  }

  if (ctx.simulate) {
    ctx.sentMessages.push(args.text)
    return `OK: Nachricht simuliert (${args.text.length} Zeichen)`
  }

  try {
    // Nachricht in DB speichern
    await prisma.message.create({
      data: {
        conversationId: ctx.conversationId,
        direction: "OUTBOUND",
        content: args.text,
        messageType: "TEXT",
        status: "SENT",
        aiGenerated: true,
      },
    })

    await prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { lastMessageAt: new Date() },
    })

    // Via Dispatcher senden (Telegram, WhatsApp, etc.)
    const dispatchResult = await dispatchMessage(ctx.conversationId, args.text)

    if (!dispatchResult.ok) {
      await prisma.executionLog.create({
        data: {
          boardId: ctx.boardId,
          conversationId: ctx.conversationId,
          action: "SEND_TEXT_FAILED",
          input: args.text,
          output: dispatchResult.error,
          status: "ERROR",
          errorMessage: dispatchResult.error,
          needsAttention: true,
        },
      })
      return `FEHLER: Versand fehlgeschlagen — ${dispatchResult.error}`
    }

    return `OK: Nachricht gesendet (${args.text.length} Zeichen)`
  } catch (error) {
    return `FEHLER: Nachricht konnte nicht gesendet werden — ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
  }
}

export async function executeSendAsset(
  args: { assetId: string },
  ctx: ToolContext
): Promise<string> {
  try {
    const asset = await prisma.boardAsset.findFirst({
      where: { id: args.assetId, boardId: ctx.boardId, isActive: true },
      select: { id: true, name: true, type: true, content: true, fileUrl: true },
    })

    if (!asset) {
      return `FEHLER: Asset nicht gefunden oder gehört nicht zu diesem Board (assetId: ${args.assetId})`
    }

    // Inhalt bestimmen: fileUrl bevorzugt für Mediendateien, content als Fallback
    const sendContent = asset.fileUrl ?? asset.content

    if (!sendContent) {
      return `FEHLER: Asset '${asset.name}' hat weder Datei-URL noch Textinhalt`
    }

    // Sprint 4: Mediendateien werden als Link-Text gesendet (Sprint 5: echte Media-Types)
    const messageText =
      asset.type === "TEXT_SNIPPET" || asset.type === "KNOWLEDGE_BASE" || asset.type === "TEMPLATE"
        ? sendContent
        : `📎 ${asset.name}: ${sendContent}`

    if (ctx.simulate) {
      ctx.sentMessages.push(messageText)
      return `OK: Asset '${asset.name}' (${asset.type}) simuliert`
    }

    await prisma.message.create({
      data: {
        conversationId: ctx.conversationId,
        direction: "OUTBOUND",
        content: messageText,
        messageType: "TEXT",
        status: "SENT",
        aiGenerated: true,
        metadata: { assetId: asset.id, assetType: asset.type },
      },
    })

    await prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { lastMessageAt: new Date() },
    })

    const assetSendResult = await dispatchMessage(ctx.conversationId, messageText)

    if (!assetSendResult.ok) {
      return `FEHLER: Asset-Versand fehlgeschlagen — ${assetSendResult.error}`
    }

    return `OK: Asset '${asset.name}' gesendet`
  } catch (error) {
    return `FEHLER: Asset konnte nicht gesendet werden — ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
  }
}

export async function executeSearchAssets(
  args: { query: string; type?: string },
  ctx: ToolContext
): Promise<string> {
  try {
    const assets = await prisma.boardAsset.findMany({
      where: {
        boardId: ctx.boardId,
        isActive: true,
        ...(args.type ? { type: args.type as never } : {}),
        OR: [
          { name: { contains: args.query, mode: "insensitive" } },
          { tags: { hasSome: [args.query] } },
        ],
      },
      select: { id: true, name: true, type: true, tags: true },
      take: 10,
    })

    if (assets.length === 0) {
      return `Keine Assets gefunden für Query: '${args.query}'`
    }

    const list = assets
      .map((a) => `- ID: ${a.id} | Name: "${a.name}" | Typ: ${a.type} | Tags: [${a.tags.join(", ")}]`)
      .join("\n")

    return `OK: ${assets.length} Asset(s) gefunden:\n${list}`
  } catch (error) {
    return `FEHLER: Asset-Suche fehlgeschlagen — ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
  }
}

export async function executeStoreMemory(
  args: { key: string; value: string },
  ctx: ToolContext
): Promise<string> {
  if (!args.key?.trim() || !args.value?.trim()) {
    return "FEHLER: key und value dürfen nicht leer sein"
  }

  if (ctx.simulate) {
    return `OK: Memory simuliert (${args.key} = ${args.value})`
  }

  try {
    await prisma.conversationMemory.upsert({
      where: {
        conversationId_key: {
          conversationId: ctx.conversationId,
          key: args.key,
        },
      },
      update: { value: args.value },
      create: {
        conversationId: ctx.conversationId,
        key: args.key,
        value: args.value,
      },
    })

    // Sync into Conversation.customData and track collectedFields
    const conv = await prisma.conversation.findUnique({
      where: { id: ctx.conversationId },
      select: { customData: true, collectedFields: true },
    })
    const customData = ((conv?.customData ?? {}) as Record<string, unknown>)
    customData[args.key] = args.value
    const collectedFields = ((conv?.collectedFields ?? []) as string[])
    if (ctx.dataToCollect.includes(args.key) && !collectedFields.includes(args.key)) {
      collectedFields.push(args.key)
    }
    await prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { customData: customData as any, collectedFields: collectedFields as any },
    })

    return `OK: Gespeichert — ${args.key} = ${args.value}`
  } catch (error) {
    return `FEHLER: Memory-Speicherung fehlgeschlagen — ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
  }
}

export async function executeGetHistory(
  args: { limit?: number },
  ctx: ToolContext
): Promise<string> {
  if (ctx.simulate) {
    return "OK: Kein Verlauf im Simulate-Modus"
  }

  try {
    const limit = Math.min(args.limit ?? 10, 20)

    const messages = await prisma.message.findMany({
      where: { conversationId: ctx.conversationId },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: { direction: true, content: true, timestamp: true },
    })

    if (messages.length === 0) {
      return "Keine Nachrichten im Verlauf gefunden"
    }

    const formatted = messages
      .reverse()
      .map((m) => {
        const role = m.direction === "OUTBOUND" ? "Agent" : "Kunde"
        const time = m.timestamp.toISOString().slice(11, 16)
        return `[${time}] ${role}: ${m.content}`
      })
      .join("\n")

    return `OK: ${messages.length} Nachricht(en):\n${formatted}`
  } catch (error) {
    return `FEHLER: Verlauf konnte nicht geladen werden — ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  switch (name) {
    case "change_state":
      return executeChangeState(args as { stateId: string }, ctx)
    case "send_text":
      return executeSendText(args as { text: string }, ctx)
    case "send_asset":
      return executeSendAsset(args as { assetId: string }, ctx)
    case "search_assets":
      return executeSearchAssets(args as { query: string; type?: string }, ctx)
    case "store_memory":
      return executeStoreMemory(args as { key: string; value: string }, ctx)
    case "get_history":
      return executeGetHistory(args as { limit?: number }, ctx)
    default:
      return `FEHLER: Unbekanntes Tool '${name}'`
  }
}

