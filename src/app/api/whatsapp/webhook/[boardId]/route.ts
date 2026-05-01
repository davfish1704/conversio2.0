import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { enqueueJob } from "@/lib/jobs/enqueue"

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
  try {
    const body = await req.json()
    if (body.object !== "whatsapp_business_account") return NextResponse.json({ ok: true })

    const channel = await prisma.boardChannel.findUnique({
      where: { boardId_platform: { boardId, platform: "whatsapp" } },
    })
    if (!channel || channel.status !== "connected") return NextResponse.json({ ok: true })

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value?.messages) continue
        for (const msg of value.messages) {
          await processWaMessage(msg, boardId, channel.waPhoneNumberId || "")
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("WA webhook error:", err)
    return NextResponse.json({ ok: true })
  }
}

async function processWaMessage(
  msg: Record<string, unknown>,
  boardId: string,
  phoneNumberId: string
) {
  const phone = msg.from as string
  const msgText = msg.text as Record<string, string> | undefined
  const msgImage = msg.image as Record<string, string> | undefined
  const content = msgText?.body || msgImage?.caption || "[Media]"

  let conversation = await prisma.conversation.findFirst({
    where: { boardId, customerPhone: phone, channel: "whatsapp" },
  })

  if (!conversation) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } },
    })
    let waAccount = await prisma.whatsAppAccount.findUnique({
      where: { phoneNumber: phoneNumberId },
    })
    if (!waAccount) {
      const team = await prisma.team.findFirst()
      if (team) {
        waAccount = await prisma.whatsAppAccount.create({
          data: { phoneNumber: phoneNumberId, teamId: team.id, status: "ACTIVE" },
        })
      }
    }
    conversation = await prisma.conversation.create({
      data: {
        customerPhone: phone,
        customerName: phone,
        channel: "whatsapp",
        source: "whatsapp",
        status: "ACTIVE",
        boardId,
        currentStateId: board?.states?.[0]?.id ?? null,
        lastMessageAt: new Date(),
        ...(waAccount ? { waAccountId: waAccount.id } : {}),
      },
    })
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
    leadId: conversation.id,
    boardId,
  })
}
