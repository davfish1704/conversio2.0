import { prisma } from "@/lib/db"

export type NotificationType = "low_confidence" | "no_reply" | "off_mission" | "agent_error" | "stuck"

// v3: AdminNotification → AdminReport with AlertType/AlertStatus enums
const notificationTypeToAlertType: Record<NotificationType, string> = {
  low_confidence: "INFO",
  no_reply: "STUCK",
  off_mission: "MANUAL_INTERVENTION",
  agent_error: "ERROR",
  stuck: "STUCK",
}

export async function createNotification(
  boardId: string,
  conversationId: string,
  type: NotificationType,
  message: string
) {
  try {
    await (prisma as any).adminReport.create({
      data: {
        boardId,
        type: notificationTypeToAlertType[type] ?? "INFO",
        message,
        details: `conversationId: ${conversationId}`,
        status: "OPEN",
      },
    })
  } catch (err) {
    console.error("Failed to create notification:", err)
  }
}
