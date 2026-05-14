import { prisma } from "@/lib/db"

export async function executeKillConversation(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data:  { status: "ARCHIVED" },
  })
}
