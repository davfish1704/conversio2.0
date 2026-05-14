import type { AdminNotificationPayload, AdminNotificationProvider, AdminProviderUser, NotificationProviderResult } from "../types"
import type { SupervisorAction } from "@prisma/client"
import { renderApprovalRequest, approvalInlineKeyboard } from "../templates/approval-request"

const BOT_TOKEN = () => process.env.ADMIN_TELEGRAM_BOT_TOKEN ?? ""
const API_BASE  = () => `https://api.telegram.org/bot${BOT_TOKEN()}`

async function telegramPost(method: string, body: object): Promise<{ ok: boolean; result?: { message_id?: number } }> {
  const res = await fetch(`${API_BASE()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

export const telegramProvider: AdminNotificationProvider = {
  channel: "TELEGRAM",

  isConfigured(user: AdminProviderUser): boolean {
    return !!user.adminTelegramChatId && !!BOT_TOKEN()
  },

  async send(user: AdminProviderUser, payload: AdminNotificationPayload): Promise<NotificationProviderResult> {
    if (!this.isConfigured(user)) {
      return { sent: false, error: "Telegram not configured" }
    }

    const levelEmoji: Record<string, string> = {
      INFO: "ℹ️",
      WARNING: "⚠️",
      ERROR: "🔴",
      CRITICAL: "🚨",
    }

    let text: string
    let reply_markup: object | undefined

    if (payload.approvalButtons && payload.supervisorActionId) {
      // Approval request: use structured template
      // Build a minimal SupervisorAction-like object for the template
      const actionForTemplate = {
        id: payload.supervisorActionId,
        urgency: (payload.metadata?.urgency as string) ?? "NORMAL",
        proposedAction: (payload.metadata?.proposedAction as string) ?? "NOTIFY_ONLY",
        triggerType: (payload.metadata?.triggerType as string) ?? "ON_DEMAND_QUERY",
        reasoning: payload.message,
        actionParams: (payload.metadata?.actionParams as Record<string, unknown>) ?? {},
        status: "PENDING_ADMIN",
        boardId: payload.boardId ?? "",
      } as unknown as SupervisorAction

      text = renderApprovalRequest(actionForTemplate)
      reply_markup = approvalInlineKeyboard(payload.supervisorActionId)
    } else {
      const emoji = levelEmoji[payload.level] ?? "ℹ️"
      text = `${emoji} *${payload.title}*\n\n${payload.message}`
    }

    const result = await telegramPost("sendMessage", {
      chat_id:    user.adminTelegramChatId,
      text,
      parse_mode: "Markdown",
      ...(reply_markup ? { reply_markup } : {}),
    })

    if (!result.ok) {
      return { sent: false, error: "Telegram sendMessage failed" }
    }

    const messageId = result.result?.message_id
    return { sent: true, messageId: messageId?.toString() }
  },

  async updateMessage(messageId: string, text: string, removeButtons = false): Promise<void> {
    // Needs chatId — stored alongside messageId as "chatId:messageId"
    const [chatId, msgId] = messageId.split(":")
    if (!chatId || !msgId) return

    await telegramPost("editMessageText", {
      chat_id:    chatId,
      message_id: parseInt(msgId, 10),
      text,
      parse_mode: "Markdown",
      ...(removeButtons ? { reply_markup: { inline_keyboard: [] } } : {}),
    })
  },
}
