import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { processAgentResponse } from "@/lib/agent"

/**
 * Telegram Bot Webhook
 * POST: Eingehende Updates vom Telegram-Server empfangen
 *
 * Webhook registrieren (einmalig):
 * https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
 *   ?url=https://<DEINE-DOMAIN>/api/webhook/telegram
 *   &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 */

export async function POST(req: NextRequest) {
  // Secret-Token prüfen (wird beim setWebhook-Aufruf gesetzt)
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token")
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (expectedSecret && secretToken !== expectedSecret) {
    console.warn("❌ Telegram Webhook: ungültiges Secret Token")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const update: TelegramUpdate = await req.json()

    const message = update.message ?? update.edited_message
    if (!message) {
      return NextResponse.json({ status: "ignored" }, { status: 200 })
    }

    const chatId = String(message.chat.id)
    const from = message.from
    const customerName =
      [from?.first_name, from?.last_name].filter(Boolean).join(" ") || chatId
    const content = extractContent(message)
    const timestamp = new Date(message.date * 1000)

    console.log(`📩 Telegram von ${customerName} (${chatId}): ${content}`)

    // Virtuelles Bridge-Account damit der FK-Constraint erfüllt ist
    // (kein Schema-Migration nötig solange kein TelegramAccount-Modell existiert)
    let bridgeAccount = await prisma.whatsAppAccount.findUnique({
      where: { phoneNumber: "telegram-bot" },
    })

    if (!bridgeAccount) {
      const firstTeam = await prisma.team.findFirst()
      if (!firstTeam) {
        console.error("❌ Kein Team gefunden — Telegram Webhook abgebrochen")
        return NextResponse.json({ status: "error" }, { status: 500 })
      }
      bridgeAccount = await prisma.whatsAppAccount.create({
        data: {
          phoneNumber: "telegram-bot",
          teamId: firstTeam.id,
          status: "ACTIVE",
        },
      })
      console.log("🔧 Telegram Bridge-Account angelegt:", bridgeAccount.id)
    }

    // Konversation suchen oder neu anlegen
    let conversation = await prisma.conversation.findFirst({
      where: { customerPhone: chatId, waAccountId: bridgeAccount.id },
    })

    if (!conversation) {
      const defaultBoard = await prisma.board.findFirst({
        where: { isActive: true },
        include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } },
      })

      conversation = await prisma.conversation.create({
        data: {
          customerPhone: chatId,
          customerName,
          waAccountId: bridgeAccount.id,
          channel: "telegram",
          source: "telegram",
          status: "ACTIVE",
          boardId: defaultBoard?.id ?? null,
          currentStateId: defaultBoard?.states?.[0]?.id ?? null,
          lastMessageAt: timestamp,
        },
      })

      console.log(`🆕 Neue Telegram-Konversation: ${conversation.id} (${chatId})`)
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: timestamp },
      })
    }

    // Nachricht speichern
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        content,
        messageType: "TEXT",
        externalId: String(message.message_id),
        timestamp,
        metadata: {
          telegramChatId: chatId,
          telegramUserId: from?.id ?? null,
          telegramUsername: from?.username ?? null,
          rawType: message.text ? "text" : "other",
        },
      },
    })

    // Agent-Antwort asynchron auslösen
    processAgentResponse(conversation.id, content).catch((err) => {
      console.error("❌ Agent-Antwort fehlgeschlagen:", err)
    })

    return NextResponse.json({ status: "received" }, { status: 200 })
  } catch (error) {
    console.error("❌ Telegram Webhook POST Fehler:", error)
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}

/* ─────────────────────────── Typen ─────────────────────────────────────── */

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: { id: number; type: string }
  date: number
  text?: string
  caption?: string
  photo?: unknown[]
  document?: { file_id: string; file_name?: string; mime_type?: string }
  voice?: { file_id: string; duration: number }
  video?: { file_id: string; duration: number }
  location?: { latitude: number; longitude: number }
  sticker?: { file_id: string; emoji?: string }
}

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

/* ─────────────────────────── Helpers ───────────────────────────────────── */

function extractContent(message: TelegramMessage): string {
  if (message.text) return message.text
  if (message.caption) return message.caption
  if (message.photo) return "[Foto]"
  if (message.document) return `[Dokument: ${message.document.file_name ?? "unbekannt"}]`
  if (message.voice) return "[Sprachnachricht]"
  if (message.video) return "[Video]"
  if (message.location)
    return `[Standort: ${message.location.latitude}, ${message.location.longitude}]`
  if (message.sticker) return `[Sticker ${message.sticker.emoji ?? ""}]`.trim()
  return "[Unbekannter Nachrichtentyp]"
}
