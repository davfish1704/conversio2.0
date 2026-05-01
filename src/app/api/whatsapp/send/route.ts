import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"
import { decrypt } from "@/lib/crypto/secrets"

/**
 * WhatsApp Send API
 * Sends a message via Meta WhatsApp Business API
 * Also saves the message to the database
 *
 * POST /api/whatsapp/send
 * Body: { to: string, message: string, conversationId?: string, phoneNumberId?: string }
 */

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate Limit: 30 WhatsApp-Nachrichten pro Minute pro User
    const limit = rateLimit(`whatsapp:${session.user.id}`, 30, 60000)
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = await req.json()
    const { to, message, conversationId, phoneNumberId: explicitPhoneNumberId } = body

    if (!to || !message) {
      return NextResponse.json({ error: "Missing required fields: to, message" }, { status: 400 })
    }

    // Resolve phone number ID via BoardChannel
    let phoneNumberId = explicitPhoneNumberId
    let accessToken: string | null = null
    let resolvedConversationId = conversationId

    if (!phoneNumberId && conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { boardId: true },
      })
      if (conversation?.boardId) {
        const bc = await prisma.boardChannel.findUnique({
          where: { boardId_platform: { boardId: conversation.boardId, platform: "whatsapp" } },
          select: { waPhoneNumberId: true, waAccessToken: true },
        })
        if (bc?.waPhoneNumberId && bc.waAccessToken) {
          phoneNumberId = bc.waPhoneNumberId
          accessToken = decrypt(bc.waAccessToken)
        }
      }
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "No WhatsApp phone number configured. Please configure a BoardChannel." },
        { status: 400 }
      )
    }

    if (!accessToken) {
      accessToken = process.env.META_ACCESS_TOKEN || null
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "META_ACCESS_TOKEN not configured" },
        { status: 500 }
      )
    }

    // Send to Meta WhatsApp API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
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

    const metaData = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error("Meta WhatsApp API error:", metaData)
      return NextResponse.json(
        { success: false, error: metaData.error?.message || "Meta API error" },
        { status: metaResponse.status }
      )
    }

    const messageId = metaData.messages?.[0]?.id

    // Save to DB if conversationId provided
    let dbMessage = null
    if (resolvedConversationId) {
      dbMessage = await prisma.message.create({
        data: {
          conversationId: resolvedConversationId,
          direction: "OUTBOUND",
          content: message,
          messageType: "TEXT",
          status: "SENT",
          externalId: messageId,
        },
      })

      // Update conversation lastMessageAt
      await prisma.conversation.update({
        where: { id: resolvedConversationId },
        data: { lastMessageAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      messageId,
      dbMessageId: dbMessage?.id,
    })
  } catch (error) {
    console.error("WhatsApp send error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
