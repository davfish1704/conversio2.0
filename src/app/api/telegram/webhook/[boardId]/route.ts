import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { enqueueJob } from "@/lib/jobs/enqueue"

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Check board active status
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { adminStatus: true, ownerStatus: true },
  })
  const boardActive = board
    ? (board as any).adminStatus !== "disabled" && (board as any).ownerStatus !== "paused"
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

    // Handle deep link: /start lead_<id> — bind chat_id to a manually-created lead
    if (typeof content === "string" && content.startsWith("/start lead_")) {
      const claimedLeadId = content.replace("/start lead_", "").trim()
      const manualLead = await prisma.conversation.findFirst({
        where: { id: claimedLeadId, boardId, channel: "telegram", externalId: null },
      })
      if (manualLead) {
        await prisma.conversation.update({
          where: { id: manualLead.id },
          data: {
            externalId: chatId,
            customerPhone: chatId,
            customerName: manualLead.customerName || customerName,
            lastMessageAt: timestamp,
          },
        })
        // Send a welcome message via normal pipeline on the now-reachable lead
        if (boardActive) {
          await enqueueJob({
            type: "process_message",
            payload: { conversationId: manualLead.id, userMessage: "/start" },
            leadId: manualLead.id,
            boardId,
          })
        }
        return NextResponse.json({ ok: true })
      }
      // Falls through to normal find-or-create if no manual lead matched
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { boardId, externalId: chatId, channel: "telegram" },
    })

    if (!conversation) {
      const defaultBoard = await prisma.board.findUnique({
        where: { id: boardId },
        include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } },
      })
      // Need a waAccountId for legacy FK - get or create bridge account
      let bridgeAccount = await prisma.whatsAppAccount.findUnique({
        where: { phoneNumber: `telegram-bot-${boardId}` },
      })
      if (!bridgeAccount) {
        const team = await prisma.team.findFirst()
        if (team) {
          bridgeAccount = await prisma.whatsAppAccount.create({
            data: { phoneNumber: `telegram-bot-${boardId}`, teamId: team.id, status: "ACTIVE" },
          })
        }
      }

      conversation = await prisma.conversation.create({
        data: {
          customerPhone: chatId,
          customerName,
          externalId: chatId,
          channel: "telegram",
          source: "telegram",
          status: "ACTIVE",
          boardId,
          currentStateId: defaultBoard?.states?.[0]?.id ?? null,
          lastMessageAt: timestamp,
          ...(bridgeAccount ? { waAccountId: bridgeAccount.id } : {}),
        },
      })
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: timestamp },
      })
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
        leadId: conversation.id,
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
