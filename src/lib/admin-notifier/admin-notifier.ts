import { prisma } from "@/lib/db"
import type { AdminNotificationPayload, AdminNotificationProvider, AdminProviderUser } from "./types"
import { telegramProvider } from "./providers/telegram-provider"
import { whatsappProvider } from "./providers/whatsapp-provider"
import { emailProvider }    from "./providers/email-provider"
import type { AdminChannel } from "@prisma/client"

const PROVIDERS: Record<AdminChannel, AdminNotificationProvider> = {
  TELEGRAM: telegramProvider,
  WHATSAPP: whatsappProvider,
  EMAIL:    emailProvider,
}

export function getProviderForUser(user: AdminProviderUser): AdminNotificationProvider {
  return PROVIDERS[user.adminChannel]
}

export async function sendAdminNotification(
  userId: string,
  payload: AdminNotificationPayload,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      adminChannel: true,
      adminTelegramChatId: true,
      adminWhatsappNumber: true,
    },
  })

  if (!user) return null

  const provider = getProviderForUser(user)
  let messageId: string | undefined

  if (provider.isConfigured(user)) {
    try {
      const result = await provider.send(user, payload)
      if (result.sent && result.messageId) {
        messageId = result.messageId
        if (user.adminChannel === "TELEGRAM" && user.adminTelegramChatId) {
          // Store as "chatId:messageId" for updateMessage
          messageId = `${user.adminTelegramChatId}:${result.messageId}`
        }
      }
    } catch (err) {
      console.error("[AdminNotifier] send failed:", err)
    }
  }

  // Persist notification record
  await prisma.adminNotification.create({
    data: {
      boardId:           payload.boardId ?? null,
      leadId:            payload.leadId  ?? null,
      level:             payload.level,
      title:             payload.title,
      message:           payload.message,
      metadata:          JSON.parse(JSON.stringify(payload.metadata ?? {})),
      telegramSent:      user.adminChannel === "TELEGRAM" && !!messageId,
      telegramMessageId: user.adminChannel === "TELEGRAM" ? messageId ?? null : null,
      channel:           user.adminChannel,
      recipientId:       userId,
      supervisorActionId: payload.supervisorActionId ?? null,
    },
  })

  return messageId ?? null
}

export async function updateNotificationMessage(
  messageId: string,
  channel: AdminChannel,
  text: string,
  removeButtons = false,
): Promise<void> {
  const provider = PROVIDERS[channel]
  try {
    await provider.updateMessage(messageId, text, removeButtons)
  } catch (err) {
    console.error("[AdminNotifier] updateMessage failed:", err)
  }
}
