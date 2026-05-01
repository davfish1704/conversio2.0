import { prisma } from "@/lib/db"

export type NotificationType = "low_confidence" | "no_reply" | "off_mission" | "agent_error" | "stuck"

export async function createNotification(
  boardId: string,
  conversationId: string,
  type: NotificationType,
  message: string
) {
  try {
    await prisma.adminNotification.create({
      data: { boardId, conversationId, type, message },
    })
  } catch (err) {
    console.error("Failed to create notification:", err)
  }
}
