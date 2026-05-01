import { prisma } from "@/lib/db"

const TELEGRAM_API = "https://api.telegram.org"

export interface TelegramSendResult {
  success: boolean
  messageId?: number
  error?: string
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN nicht konfiguriert")
    return { success: false, error: "TELEGRAM_BOT_TOKEN nicht konfiguriert" }
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    })

    const data = await response.json()

    if (!response.ok || !data.ok) {
      console.error("❌ Telegram Versand fehlgeschlagen:", data)
      return { success: false, error: data.description || "Unbekannter Fehler" }
    }

    return { success: true, messageId: data.result?.message_id }
  } catch (error) {
    console.error("❌ Telegram Versand Fehler:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
    }
  }
}

export async function sendTelegramMessageAndStore(
  conversationId: string,
  chatId: string,
  text: string,
  aiGenerated = false
): Promise<TelegramSendResult> {
  const result = await sendTelegramMessage(chatId, text)

  await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      content: text,
      messageType: "TEXT",
      status: result.success ? "SENT" : "FAILED",
      aiGenerated,
      externalId: result.messageId ? String(result.messageId) : undefined,
    },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })

  return result
}
