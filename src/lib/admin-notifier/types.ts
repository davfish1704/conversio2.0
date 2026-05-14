import type { AdminChannel } from "@prisma/client"

export interface AdminNotificationPayload {
  title: string
  message: string
  level: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
  boardId?: string
  leadId?: string
  metadata?: Record<string, unknown>
  supervisorActionId?: string
  approvalButtons?: boolean
}

export interface NotificationProviderResult {
  sent: boolean
  messageId?: string
  error?: string
}

export interface AdminNotificationProvider {
  channel: AdminChannel
  isConfigured(user: AdminProviderUser): boolean
  send(user: AdminProviderUser, payload: AdminNotificationPayload): Promise<NotificationProviderResult>
  updateMessage(messageId: string, text: string, removeButtons?: boolean): Promise<void>
}

export interface AdminProviderUser {
  id: string
  adminChannel: AdminChannel
  adminTelegramChatId?: string | null
  adminWhatsappNumber?: string | null
}
