import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { processAgentResponse } from "@/lib/agent"
import crypto from "crypto"

/**
 * WhatsApp Webhook Endpoint for Meta Business API
 * GET:  Webhook verification (subscription challenge)
 * POST: Receives incoming WhatsApp messages, saves to DB, triggers agent
 *
 * Callback URL: https://<DEINE-DOMAIN>/api/webhook/whatsapp
 */

/* ──────────────────────────── GET: Verification ─────────────────────────── */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log("✅ WhatsApp Webhook verified")
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn("❌ WhatsApp Webhook verification failed")
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/* ──────────────────────────── POST: Messages ────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // X-Hub-Signature-256 verifizieren (B1 Security Fix)
    const rawBody = await req.text()
    const signature = req.headers.get("x-hub-signature-256")
    const appSecret = process.env.META_APP_SECRET

    if (!appSecret) {
      console.error("❌ META_APP_SECRET nicht konfiguriert")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!signature) {
      console.warn("❌ Webhook-Request ohne Signatur abgelehnt")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const expected = "sha256=" + crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex")

    if (signature !== expected) {
      console.warn("❌ Webhook-Signatur ungültig")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = JSON.parse(rawBody)

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 })
    }

    // Loop through entries → changes → value → messages
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value

        if (!value || !value.messages) continue

        const metadata = {
          phoneNumberId: value.metadata?.phone_number_id,
          displayPhoneNumber: value.metadata?.display_phone_number,
        }

        for (const message of value.messages) {
          await processIncomingMessage(message, metadata)
        }
      }
    }

    return NextResponse.json({ status: "received" }, { status: 200 })
  } catch (error) {
    console.error("❌ WhatsApp Webhook POST error:", error)
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}

/* ──────────────────────────── Helper ────────────────────────────────────── */

interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: string
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  audio?: { id: string; mime_type: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename?: string; caption?: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  button?: { payload: string; text: string }
  interactive?: {
    type: string
    button_reply?: { id: string; title: string }
    list_reply?: { id: string; title: string }
  }
  context?: { forwarded?: boolean; frequently_forwarded?: boolean; from?: string; id?: string }
}

interface WhatsAppMetadata {
  phoneNumberId?: string
  displayPhoneNumber?: string
}

async function processIncomingMessage(message: WhatsAppMessage, metadata: WhatsAppMetadata) {
  const phoneNumber = message.from
  const timestamp = parseInt(message.timestamp) * 1000
  const waPhoneNumberId = metadata.phoneNumberId || ""

  // Extract content based on message type
  let content = ""
  let messageType = message.type.toUpperCase()

  switch (message.type) {
    case "text":
      content = message.text?.body || ""
      break
    case "image":
      content = message.image?.caption || "[Image]"
      break
    case "audio":
      content = "[Voice message]"
      break
    case "video":
      content = message.video?.caption || "[Video]"
      break
    case "document":
      content = message.document?.caption || `[Document: ${message.document?.filename || "unknown"}]`
      break
    case "location":
      content = `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`
      break
    case "button":
      content = `[Button: ${message.button?.text}]`
      break
    case "interactive":
      content = `[Interactive: ${message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || ""}]`
      break
    default:
      content = `[Unknown type: ${message.type}]`
  }

  console.log(`📩 Message from ${phoneNumber}: ${content}`)

  // 1. Find or create WhatsApp Account
  let waAccount = await prisma.whatsAppAccount.findUnique({
    where: { phoneNumber: waPhoneNumberId },
  })

  if (!waAccount) {
    // Create a placeholder account - in production this should be pre-configured
    const firstTeam = await prisma.team.findFirst()
    if (firstTeam) {
      waAccount = await prisma.whatsAppAccount.create({
        data: {
          phoneNumber: waPhoneNumberId,
          teamId: firstTeam.id,
          status: "ACTIVE",
        },
      })
    }
  }

  if (!waAccount) {
    console.error("❌ No WhatsApp account found and no team to create one")
    return
  }

  // 2. Find or create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      customerPhone: phoneNumber,
      waAccountId: waAccount.id,
    },
  })

  if (!conversation) {
    // Get default board (first active board)
    const defaultBoard = await prisma.board.findFirst({
      where: { isActive: true },
      include: { states: { orderBy: { orderIndex: "asc" }, take: 1 } },
    })

    conversation = await prisma.conversation.create({
      data: {
        customerPhone: phoneNumber,
        customerName: phoneNumber, // Will be updated via contact API later
        waAccountId: waAccount.id,
        status: "ACTIVE",
        boardId: defaultBoard?.id || null,
        currentStateId: defaultBoard?.states?.[0]?.id || null,
        lastMessageAt: new Date(timestamp),
      },
    })

    console.log(`🆕 New conversation created: ${conversation.id} for ${phoneNumber}`)
  } else {
    // Update lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(timestamp) },
    })
  }

  // 3. Save inbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      content,
      messageType: messageType as any,
      externalId: message.id,
      timestamp: new Date(timestamp),
      metadata: {
        rawType: message.type,
        phoneNumberId: waPhoneNumberId,
      },
    },
  })

  // 4. Trigger agent response (async, don't wait)
  processAgentResponse(conversation.id, content).catch((err) => {
    console.error("❌ Agent response failed:", err)
  })
}
