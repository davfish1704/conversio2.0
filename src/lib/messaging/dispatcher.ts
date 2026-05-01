import { prisma } from "@/lib/db"
import { decrypt } from "@/lib/crypto/secrets"

export interface SendResult {
  ok: boolean
  externalMessageId?: string
  error?: string
}

export async function sendMessage(conversationId: string, text: string): Promise<SendResult> {
  const conversation = await (prisma as any).conversation.findUnique({
    where: { id: conversationId },
    select: {
      channel: true,
      externalId: true,
      boardId: true,
      lead: { select: { phone: true } },
    },
  })
  if (!conversation) return { ok: false, error: "Conversation not found" }

  const channel = conversation.channel || "whatsapp"
  const boardId = conversation.boardId

  if (channel === "telegram") {
    // Get per-board Telegram channel
    let token: string | null = null
    if (boardId) {
      const bc = await prisma.boardChannel.findUnique({
        where: { boardId_platform: { boardId, platform: "telegram" } },
        select: { telegramBotToken: true, status: true },
      })
      if (bc?.telegramBotToken) token = decrypt(bc.telegramBotToken)
    }
    // Fallback to global env token
    if (!token) token = process.env.TELEGRAM_BOT_TOKEN || null
    if (!token) return { ok: false, error: "No Telegram token configured" }

    const chatId = conversation.externalId || conversation.lead?.phone
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description }
    return { ok: true, externalMessageId: String(data.result?.message_id) }
  }

  if (channel === "whatsapp") {
    let phoneNumberId: string | null = null
    let accessToken: string | null = null

    if (boardId) {
      const bc = await prisma.boardChannel.findUnique({
        where: { boardId_platform: { boardId, platform: "whatsapp" } },
        select: { waPhoneNumberId: true, waAccessToken: true, status: true },
      })
      if (bc?.waPhoneNumberId && bc.waAccessToken) {
        phoneNumberId = bc.waPhoneNumberId
        accessToken = decrypt(bc.waAccessToken)
      }
    }

    if (!phoneNumberId || !accessToken) return { ok: false, error: "WhatsApp not configured" }

    // For channel-switched conversations, externalId holds the WA phone; otherwise fall back to lead.phone
    const recipient = conversation.externalId || (conversation.lead?.phone ?? "")

    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { body: text },
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message }
    return { ok: true, externalMessageId: data.messages?.[0]?.id }
  }

  return { ok: false, error: `Channel ${channel} not supported` }
}
