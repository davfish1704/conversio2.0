import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { enqueueJob } from "@/lib/jobs/enqueue"
import { findInviteByToken, consumeInvite } from "@/lib/channel-invites"
import { decrypt } from "@/lib/crypto/secrets"

const CHANNEL_TOKEN_RE = /^[\w-]{10,16}$/

export async function POST(req: NextRequest, { params }: { params: { boardId: string } }) {
  const { boardId } = params

  // Verify secret token
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token")
  const channel = await prisma.boardChannel.findUnique({
    where: { boardId_platform: { boardId, platform: "telegram" } },
  })
  if (!channel || channel.status !== "connected") {
    return NextResponse.json({ error: "Not configured" }, { status: 404 })
  }
  if (channel.telegramWebhookSecret && secretHeader !== channel.telegramWebhookSecret) {
    // Return 200 to stop Telegram from retrying; invalid secret = silently drop
    console.warn("[telegram-webhook] Invalid secret token, dropping request for board", boardId)
    return NextResponse.json({ ok: true })
  }

  // Check board active status
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { adminStatus: true, ownerStatus: true },
  })
  const boardActive = board
    ? (board as any).adminStatus.toString() !== "SUSPENDED" && (board as any).ownerStatus !== "INACTIVE"
    : true

  try {
    const update = await req.json()
    const message = update.message ?? update.edited_message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = String(message.chat.id)
    const from = message.from
    const customerName =
      [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
      from?.username ||
      chatId
    const content = extractContent(message)
    const timestamp = new Date(message.date * 1000)

    // Handle deep link: /start <token|lead_id>
    if (typeof content === "string" && content.startsWith("/start ")) {
      const startParam = content.slice(7).trim()

      // Invite-Token erkennen (nicht lead_-Präfix, 10-16 Zeichen)
      if (!startParam.startsWith("lead_") && CHANNEL_TOKEN_RE.test(startParam)) {
        const rawBotToken = channel.telegramBotToken
          ? decrypt(channel.telegramBotToken)
          : (process.env.TELEGRAM_BOT_TOKEN ?? null)

        const sendBotMsg = async (text: string) => {
          if (!rawBotToken) return
          await fetch(`https://api.telegram.org/bot${rawBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
          })
        }

        const invite = await findInviteByToken(startParam)

        if (!invite) {
          console.log("[invalid-token] Token nicht gefunden:", startParam)
          await sendBotMsg("Dieser Link ist nicht mehr gültig.")
          return NextResponse.json({ ok: true })
        }
        if ((invite as any).status === "CONSUMED") {
          console.log("[invalid-token] Token bereits verwendet:", startParam)
          await sendBotMsg("Dieser Link wurde bereits verwendet.")
          return NextResponse.json({ ok: true })
        }
        if ((invite as any).status !== "PENDING" || new Date((invite as any).expiresAt) <= new Date()) {
          console.log("[invalid-token] Token abgelaufen:", startParam)
          await sendBotMsg("Dieser Link ist nicht mehr gültig.")
          return NextResponse.json({ ok: true })
        }
        if ((invite as any).boardId !== boardId) {
          console.log("[invalid-token] boardId mismatch:", { inviteBoardId: (invite as any).boardId, boardId })
          await sendBotMsg("Fehler: Ungültige Einladung.")
          return NextResponse.json({ ok: true })
        }

        if ((invite as any).source === "BOARD_ACQUISITION") {
          // CASE A: Neuer Lead aus Akquise-Link
          const defaultState = await (prisma as any).state.findFirst({
            where: { boardId },
            orderBy: { orderIndex: "asc" },
          })

          const newLead = await (prisma as any).lead.create({
            data: {
              boardId,
              name: customerName,
              phone: chatId,
              channel: "telegram",
              source: (invite as any).campaign
                ? `meta_ad:${(invite as any).campaign}`
                : "telegram_acquisition",
              tags: [],
              currentStateId: defaultState?.id ?? null,
              customData: {},
            },
          })

          const conv = await (prisma as any).conversation.create({
            data: {
              leadId: newLead.id,
              boardId,
              channel: "telegram",
              externalId: chatId,
              status: "ACTIVE",
              lastMessageAt: timestamp,
            },
          })

          // TODO: Wenn boardBrain ein Welcome-Message-Feld bekommt, hier auto-greeten
          await consumeInvite(startParam, conv.id)
          console.log("[acquisition] new lead created", {
            leadId: newLead.id,
            conversationId: conv.id,
            campaign: (invite as any).campaign ?? null,
          })

          if (boardActive) {
            await enqueueJob({
              type: "process_message",
              payload: { conversationId: conv.id, userMessage: "/start" },
              leadId: newLead.id,
              boardId,
            })
          }
          return NextResponse.json({ ok: true })
        }

        // CASE B: LEAD_REINVITE — bestehenden Lead mit neuem Telegram-Channel verknüpfen
        const existingLead = (invite as any).lead
        let conv = await (prisma as any).conversation.findFirst({
          where: { leadId: existingLead.id, channel: "telegram", boardId },
        })
        if (!conv) {
          conv = await (prisma as any).conversation.create({
            data: {
              leadId: existingLead.id,
              boardId,
              channel: "telegram",
              externalId: chatId,
              status: "ACTIVE",
              lastMessageAt: timestamp,
            },
          })
        } else {
          await (prisma as any).conversation.update({
            where: { id: conv.id },
            data: { externalId: chatId, lastMessageAt: timestamp },
          })
        }
        await consumeInvite(startParam, conv.id)
        console.log("[reinvite] channel added to lead", { leadId: existingLead.id, conversationId: conv.id })
        return NextResponse.json({ ok: true })
      }
    }

    // Handle deep link: /start lead_<id> — bind chat_id to a manually-created lead
    if (typeof content === "string" && content.startsWith("/start lead_")) {
      const claimedLeadId = content.replace("/start lead_", "").trim()
      const manualLead = await (prisma as any).lead.findFirst({
        where: { id: claimedLeadId, boardId, channel: "telegram" },
        include: {
          conversations: {
            where: { channel: "telegram", externalId: null },
            take: 1,
          },
        },
      })
      if (manualLead) {
        // Update lead phone mit chatId (phone = chatId für Telegram)
        await (prisma as any).lead.update({
          where: { id: manualLead.id },
          data: {
            phone: chatId,
            name: manualLead.name || customerName,
          },
        })
        // Update conversation externalId
        const conv = manualLead.conversations[0]
        if (conv) {
          await (prisma as any).conversation.update({
            where: { id: conv.id },
            data: {
              externalId: chatId,
              lastMessageAt: timestamp,
            },
          })
          if (boardActive) {
            await enqueueJob({
              type: "process_message",
              payload: { conversationId: conv.id, userMessage: "/start" },
              leadId: manualLead.id,
              boardId,
            })
          }
        }
        return NextResponse.json({ ok: true })
      }
      // Falls through to normal find-or-create if no manual lead matched
    }

    // Find or create via lead (phone = chatId für Telegram)
    let lead = await (prisma as any).lead.findFirst({
      where: { boardId, phone: chatId, channel: "telegram" },
    })

    let conversation = null

    if (!lead) {
      const defaultBoard = await prisma.board.findUnique({
        where: { id: boardId },
        include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } },
      })

      lead = await (prisma as any).lead.create({
        data: {
          boardId,
          name: customerName,
          phone: chatId,
          channel: "telegram",
          source: "telegram",
          tags: [],
          currentStateId: (defaultBoard as any)?.states?.[0]?.id ?? null,
          customData: {},
        },
      })

      conversation = await (prisma as any).conversation.create({
        data: {
          leadId: lead.id,
          boardId,
          channel: "telegram",
          status: "ACTIVE",
          externalId: chatId,
          lastMessageAt: timestamp,
        },
      })
    } else {
      // Lead existiert — finde oder erstelle Conversation
      conversation = await (prisma as any).conversation.findFirst({
        where: { leadId: lead.id, channel: "telegram" },
      })

      if (!conversation) {
        conversation = await (prisma as any).conversation.create({
          data: {
            leadId: lead.id,
            boardId,
            channel: "telegram",
            status: "ACTIVE",
            externalId: chatId,
            lastMessageAt: timestamp,
          },
        })
      } else {
        await (prisma as any).conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: timestamp },
        })
      }
    }

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
          telegramUserId: from?.id,
          telegramUsername: from?.username,
        },
      },
    })

    if (boardActive) {
      await enqueueJob({
        type: "process_message",
        payload: { conversationId: conversation.id, userMessage: content },
        leadId: lead.id,
        boardId,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Telegram webhook error:", err)
    return NextResponse.json({ ok: true }) // Always 200 to Telegram
  }
}

function extractContent(msg: Record<string, unknown>): string {
  if (msg.text) return msg.text as string
  if (msg.caption) return msg.caption as string
  if (msg.photo) return "[Foto]"
  const doc = msg.document as Record<string, unknown> | undefined
  if (doc) return `[Dokument: ${(doc.file_name as string) ?? ""}]`
  if (msg.voice) return "[Sprachnachricht]"
  if (msg.video) return "[Video]"
  const loc = msg.location as Record<string, unknown> | undefined
  if (loc) return `[Standort: ${loc.latitude}, ${loc.longitude}]`
  const sticker = msg.sticker as Record<string, unknown> | undefined
  if (sticker) return `[Sticker ${(sticker.emoji as string) ?? ""}]`.trim()
  return "[Unbekannt]"
}
