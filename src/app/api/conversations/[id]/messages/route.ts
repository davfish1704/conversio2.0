import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertConversationOwnership } from "@/lib/auth-helpers"
import { sendMessage } from "@/lib/messaging/dispatcher"

// GET /api/conversations/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversationId = params.id

    const denied = await assertConversationOwnership(conversationId, session.user.id)
    if (denied) return denied

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: "asc" },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversationId = params.id

    const denied = await assertConversationOwnership(conversationId, session.user.id)
    if (denied) return denied

    const body = await req.json()
    const { content, direction = "OUTBOUND", messageType = "TEXT", status = "SENT", aiGenerated = false } = body

    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        direction,
        content,
        messageType,
        status,
        aiGenerated,
      },
    })

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    if (direction === "OUTBOUND") {
      const result = await sendMessage(conversationId, content)
      if (!result.ok) {
        console.error("[outbound-send] Failed:", result.error)
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "FAILED" },
        })
      } else if (result.externalMessageId) {
        // await prisma.message.update({ where: { id: message.id }, data: { externalId: result.externalMessageId } })
      }
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error("Message create error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
