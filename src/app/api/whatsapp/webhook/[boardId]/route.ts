import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { prisma } from "@/lib/db"
import { enqueueJob } from "@/lib/jobs/enqueue"
import { findInviteByToken, consumeInvite } from "@/lib/channel-invites"

const TOKEN_RE = /^Start\s+([\w-]{10,16})$/

export async function GET(req: NextRequest, { params }: { params: { boardId: string } }) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const channel = await prisma.boardChannel.findUnique({
    where: { boardId_platform: { boardId: params.boardId, platform: "whatsapp" } },
  })
  if (mode === "subscribe" && channel?.waVerifyToken && token === channel.waVerifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(req: NextRequest, { params }: { params: { boardId: string } }) {
  const { boardId } = params

  // Raw body einmal lesen — wird für HMAC und JSON-Parse gebraucht
  const rawBody = await req.text()

  const channel = await prisma.boardChannel.findUnique({
    where: { boardId_platform: { boardId, platform: "whatsapp" } },
  })
  if (!channel || channel.status !== "connected") return NextResponse.json({ ok: true })

  // HMAC-Check wenn webhookSecret konfiguriert
  if ((channel as any).webhookSecret) {
    const sig = req.headers.get("x-hub-signature-256") ?? ""
    const expected = `sha256=${createHmac("sha256", (channel as any).webhookSecret as string)
      .update(rawBody)
      .digest("hex")}`
    if (sig !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  try {
    const body = JSON.parse(rawBody)
    if (body.object !== "whatsapp_business_account") return NextResponse.json({ ok: true })

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value?.messages) continue
        for (const msg of value.messages) {
          await processWaMessage(msg, boardId)
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("WA webhook error:", err)
    return NextResponse.json({ ok: true })
  }
}

async function processWaMessage(msg: Record<string, unknown>, boardId: string) {
  const phone = msg.from as string
  const msgText = msg.text as Record<string, string> | undefined
  const msgImage = msg.image as Record<string, string> | undefined
  const content = msgText?.body || msgImage?.caption || "[Media]"

  // Channel-Switch: "Start <token>" erkennen → Invite einlösen
  const tokenMatch = typeof content === "string" ? content.match(TOKEN_RE) : null
  if (tokenMatch) {
    const token = tokenMatch[1]
    const invite = await findInviteByToken(token)
    if (invite && invite.status === "PENDING" && new Date(invite.expiresAt) > new Date()) {
      let conversation = await (prisma as any).conversation.findFirst({
        where: { leadId: invite.lead.id, channel: "whatsapp", boardId },
      })
      if (!conversation) {
        conversation = await (prisma as any).conversation.create({
          data: {
            leadId: invite.lead.id,
            boardId,
            channel: "whatsapp",
            externalId: phone, // WA-Telefon für Outbound-Nachrichten
            status: "ACTIVE",
            lastMessageAt: new Date(),
          },
        })
      } else {
        await (prisma as any).conversation.update({
          where: { id: conversation.id },
          data: { externalId: phone, lastMessageAt: new Date() },
        })
      }
      await consumeInvite(token, conversation.id)
      // Kein Job für die Start-Nachricht
      return
    }
  }

  // Normaler Flow: Lead per Telefonnummer suchen oder anlegen
  let lead = await (prisma as any).lead.findFirst({
    where: { boardId, phone, channel: "whatsapp" },
  })

  let conversation = null

  if (!lead) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } },
    })

    lead = await (prisma as any).lead.create({
      data: {
        boardId,
        phone,
        name: phone,
        channel: "whatsapp",
        source: "whatsapp",
        tags: [],
        currentStateId: (board as any)?.states?.[0]?.id ?? null,
        customData: {},
      },
    })

    conversation = await (prisma as any).conversation.create({
      data: {
        leadId: lead.id,
        boardId,
        channel: "whatsapp",
        status: "ACTIVE",
        lastMessageAt: new Date(),
      },
    })
  } else {
    conversation = await (prisma as any).conversation.findFirst({
      where: { leadId: lead.id, channel: "whatsapp" },
    })

    if (!conversation) {
      conversation = await (prisma as any).conversation.create({
        data: {
          leadId: lead.id,
          boardId,
          channel: "whatsapp",
          status: "ACTIVE",
          lastMessageAt: new Date(),
        },
      })
    } else {
      await (prisma as any).conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })
    }
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      content,
      messageType: "TEXT",
      externalId: msg.id as string,
      timestamp: new Date(parseInt(msg.timestamp as string) * 1000),
    },
  })

  await enqueueJob({
    type: "process_message",
    payload: { conversationId: conversation.id, userMessage: content },
    leadId: lead.id,
    boardId,
  })
}
