// src/lib/ai/tools.ts
// Tool-Definitionen und Executor-Funktionen für die AI Agent Engine (Sprint 4)
//
// sendViaWhatsApp ist eine lokale Kopie von agent.ts:sendWhatsAppMessage (private dort).
// Konsolidierung zu einem shared Helper erfolgt in Schritt 5 (agent.ts Integration).

import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"
import type { GroqTool } from "@/lib/ai/groq-client"

// ── ToolContext ───────────────────────────────────────────────────────────────

export interface ToolContext {
  conversationId: string
  boardId: string
  waAccountId: string
  customerPhone: string
  simulate: boolean
  sentMessages: string[]      // Engine initialisiert; send_text/send_asset pushen hier rein (simulate)
  stateTransitions: string[]  // Engine initialisiert; change_state pusht hier rein (simulate)
}

// ── Tool-Definitionen (JSON Schema) ──────────────────────────────────────────

export const TOOL_DEFINITIONS: GroqTool[] = [
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
      name: "send_text",
      description: "Sendet eine Textnachricht an den Kunden via WhatsApp.",
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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
  },
  {
    type: "function",
    function: {
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

    // Via WhatsApp senden
    const result = await sendViaWhatsApp(ctx.customerPhone, args.text, ctx.waAccountId)

    if (!result.success) {
      // Fehlschlag loggen damit Operator eingreifen kann
      await prisma.executionLog.create({
        data: {
          boardId: ctx.boardId,
          conversationId: ctx.conversationId,
          action: "SEND_TEXT_FAILED",
          input: args.text,
          output: result.error,
          status: "ERROR",
          errorMessage: result.error,
          needsAttention: true,
        },
      })
      return `FEHLER: WhatsApp-Versand fehlgeschlagen — ${result.error}`
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

    const result = await sendViaWhatsApp(ctx.customerPhone, messageText, ctx.waAccountId)

    if (!result.success) {
      return `FEHLER: Asset-Versand fehlgeschlagen — ${result.error}`
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

// ── Private Helper ────────────────────────────────────────────────────────────
// Lokale Kopie von agent.ts:sendWhatsAppMessage (dort private).
// TODO Sprint 5: zu einem shared src/lib/whatsapp-sender.ts extrahieren.

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

async function sendViaWhatsApp(
  to: string,
  message: string,
  waAccountId: string
): Promise<SendResult> {
  try {
    const waAccount = await prisma.whatsAppAccount.findUnique({
      where: { id: waAccountId },
    })

    if (!waAccount) {
      return { success: false, error: "WhatsApp-Account nicht gefunden" }
    }

    const accessToken = process.env.META_ACCESS_TOKEN

    if (!accessToken) {
      return { success: false, error: "META_ACCESS_TOKEN nicht konfiguriert" }
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${waAccount.phoneNumber}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error?.message || "Meta API Fehler" }
    }

    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    }
  }
}
