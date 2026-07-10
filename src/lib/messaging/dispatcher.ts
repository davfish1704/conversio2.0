import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/crypto/secrets"

function flowLog(step: string, msg: string, data?: Record<string, unknown>) {
  const extra = data ? ` ${JSON.stringify(data)}` : ""
  console.log(`[FLOW:${step}] ${msg}${extra}`)
}

export interface SendResult {
  ok: boolean
  externalMessageId?: string
  error?: string
}

export interface MediaPayload {
  url: string
  mimeType: string
  filename: string
  caption?: string
}

// ─── helpers ────────────────────────────────────────────────────────────────

function whatsappMediaType(mimeType: string): "image" | "audio" | "video" | "document" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("video/")) return "video"
  return "document"
}

function telegramMediaMethod(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "sendPhoto"
  if (mimeType.startsWith("audio/")) return "sendAudio"
  if (mimeType.startsWith("video/")) return "sendVideo"
  return "sendDocument"
}

function telegramMediaKey(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "photo"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("video/")) return "video"
  return "document"
}

// Extracts R2 asset URLs from AI-generated text
export function detectAssetUrls(text: string): string[] {
  const base = process.env.R2_PUBLIC_URL
  if (!base) return []
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`${escaped}/[^\\s)"']+`, "g")
  return Array.from(new Set(text.match(re) ?? []))
}

// ─── channel-fetching helpers ────────────────────────────────────────────────

async function fetchConversationRouting(conversationId: string) {
  return (prisma as any).conversation.findUnique({
    where: { id: conversationId },
    select: {
      channel:    true,
      externalId: true,
      boardId:    true,
      lead:       { select: { phone: true } },
    },
  })
}

async function fetchTelegramToken(boardId: string | null): Promise<string | null> {
  if (boardId) {
    const bc = await prisma.boardChannel.findUnique({
      where:  { boardId_platform: { boardId, platform: "telegram" } },
      select: { telegramBotToken: true },
    })
    if (bc?.telegramBotToken) return decrypt(bc.telegramBotToken)
  }
  return process.env.TELEGRAM_BOT_TOKEN ?? null
}

async function fetchWhatsAppCreds(boardId: string | null) {
  if (boardId) {
    const bc = await prisma.boardChannel.findUnique({
      where:  { boardId_platform: { boardId, platform: "whatsapp" } },
      select: { waPhoneNumberId: true, waAccessToken: true },
    })
    if (bc?.waPhoneNumberId && bc.waAccessToken) {
      return { phoneNumberId: bc.waPhoneNumberId, accessToken: decrypt(bc.waAccessToken) }
    }
  }
  return null
}

// ─── sendMessage (text) ──────────────────────────────────────────────────────

export async function sendMessage(conversationId: string, text: string): Promise<SendResult> {
  flowLog("dispatcher_send", `convId=${conversationId} channel=... textLen=${text.length}`)
  const conversation = await fetchConversationRouting(conversationId)
  if (!conversation) { flowLog("dispatcher_error", `convId=${conversationId} err=conversation_not_found`); return { ok: false, error: "Conversation not found" } }

  const channel = conversation.channel || "whatsapp"
  const boardId = conversation.boardId
  flowLog("dispatcher_channel", `convId=${conversationId} channel=${channel}`)

  if (channel === "telegram") {
    const token = await fetchTelegramToken(boardId)
    if (!token) { flowLog("dispatcher_error", `convId=${conversationId} err=no_telegram_token`); return { ok: false, error: "No Telegram token configured" } }

    const chatId = conversation.externalId || conversation.lead?.phone
    flowLog("dispatcher_telegram_send", `convId=${conversationId} chatId=${chatId}`)
    const res  = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: chatId, text }),
    })
    const data = await res.json()
    if (!data.ok) {
      flowLog("dispatcher_error", `convId=${conversationId} err=${data.description}`)
      return { ok: false, error: data.description }
    }
    flowLog("dispatcher_sent", `convId=${conversationId} msgId=${data.result?.message_id}`)
    return { ok: true, externalMessageId: String(data.result?.message_id) }
  }

  if (channel === "whatsapp") {
    const creds = await fetchWhatsAppCreds(boardId)
    if (!creds) { flowLog("dispatcher_error", `convId=${conversationId} err=no_wa_creds`); return { ok: false, error: "WhatsApp not configured" } }

    const recipient = conversation.externalId || (conversation.lead?.phone ?? "")
    flowLog("dispatcher_wa_send", `convId=${conversationId} recipient=${recipient}`)
    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                recipient,
        type:              "text",
        text:              { body: text },
      }),
    })
    const data = await res.json()
    if (!res.ok) { flowLog("dispatcher_error", `convId=${conversationId} err=${data.error?.message}`); return { ok: false, error: data.error?.message } }
    flowLog("dispatcher_sent", `convId=${conversationId} msgId=${data.messages?.[0]?.id}`)
    return { ok: true, externalMessageId: data.messages?.[0]?.id }
  }

  flowLog("dispatcher_error", `convId=${conversationId} err=unsupported_channel_${channel}`)
  return { ok: false, error: `Channel ${channel} not supported` }
}

// ─── sendMediaMessage ────────────────────────────────────────────────────────

export async function sendMediaMessage(
  conversationId: string,
  media: MediaPayload,
): Promise<SendResult> {
  const conversation = await fetchConversationRouting(conversationId)
  if (!conversation) return { ok: false, error: "Conversation not found" }

  const channel = conversation.channel || "whatsapp"
  const boardId = conversation.boardId

  if (channel === "telegram") {
    const token = await fetchTelegramToken(boardId)
    if (!token) return { ok: false, error: "No Telegram token configured" }

    const chatId = conversation.externalId || conversation.lead?.phone
    const method = telegramMediaMethod(media.mimeType)
    const key    = telegramMediaKey(media.mimeType)

    const body: Record<string, unknown> = { chat_id: chatId, [key]: media.url }
    if (media.caption) body.caption = media.caption
    if (key === "document") body.filename = media.filename

    const res  = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!data.ok) {
      flowLog("dispatcher_media_error", `convId=${conversationId} method=${method} key=${key} err=${data.description} url=${media.url?.slice(0, 80)}`)
      return { ok: false, error: data.description }
    }
    flowLog("dispatcher_media_sent", `convId=${conversationId} method=${method} msgId=${data.result?.message_id}`)
    return { ok: true, externalMessageId: String(data.result?.message_id) }
  }

  if (channel === "whatsapp") {
    const creds = await fetchWhatsAppCreds(boardId)
    if (!creds) return { ok: false, error: "WhatsApp not configured" }

    const recipient = conversation.externalId || (conversation.lead?.phone ?? "")
    const mediaType = whatsappMediaType(media.mimeType)

    const mediaObj: Record<string, unknown> = { link: media.url }
    if (media.caption && (mediaType === "image" || mediaType === "video" || mediaType === "document")) {
      mediaObj.caption = media.caption
    }
    if (mediaType === "document") {
      mediaObj.filename = media.filename
    }

    const res = await fetch(`https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type:    "individual",
        to:                recipient,
        type:              mediaType,
        [mediaType]:       mediaObj,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message }
    return { ok: true, externalMessageId: data.messages?.[0]?.id }
  }

  return { ok: false, error: `Channel ${channel} not supported` }
}

// ─── sendAIResponse ──────────────────────────────────────────────────────────
// Detects embedded R2 asset URLs in AI text, sends each as a proper media
// message, then sends the remaining text (if any). Falls back to plain
// sendMessage if media dispatch fails.

export async function sendAIResponse(
  conversationId: string,
  text: string,
): Promise<SendResult> {
  flowLog("dispatcher_ai_response", `convId=${conversationId} textLen=${text.length}`)
  const urls = detectAssetUrls(text)
  flowLog("dispatcher_assets_detected", `convId=${conversationId} urls=${urls.length}`)

  if (urls.length === 0) {
    return sendMessage(conversationId, text)
  }

  // Strip detected URLs from text; trim leftover whitespace/punctuation
  let remaining = text
  for (const url of urls) {
    remaining = remaining.replace(url, "").replace(/\s{2,}/g, " ").trim()
  }

  // Send each asset as a media message
  for (const url of urls) {
    const asset = await prisma.asset.findFirst({
      where:  { publicUrl: url },
      select: { name: true, mimeType: true, publicUrl: true },
    })

    if (asset) {
      const result = await sendMediaMessage(conversationId, {
        url:      asset.publicUrl,
        mimeType: asset.mimeType,
        filename: asset.name,
      })
      if (!result.ok) {
        // Fallback: include URL in text
        remaining = remaining ? `${remaining}\n${url}` : url
      }
    } else {
      remaining = remaining ? `${remaining}\n${url}` : url
    }
  }

  // Send leftover text if any
  if (remaining) {
    return sendMessage(conversationId, remaining)
  }

  return { ok: true }
}
