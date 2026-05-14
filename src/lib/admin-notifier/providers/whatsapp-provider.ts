import type { AdminNotificationPayload, AdminNotificationProvider, AdminProviderUser, NotificationProviderResult } from "../types"

export const whatsappProvider: AdminNotificationProvider = {
  channel: "WHATSAPP",

  isConfigured(_user: AdminProviderUser): boolean {
    return false
  },

  async send(_user: AdminProviderUser, _payload: AdminNotificationPayload): Promise<NotificationProviderResult> {
    throw new Error("WhatsApp Admin Provider: NOT_IMPLEMENTED")
  },

  async updateMessage(_messageId: string, _text: string, _removeButtons?: boolean): Promise<void> {
    throw new Error("WhatsApp Admin Provider: NOT_IMPLEMENTED")
  },
}
