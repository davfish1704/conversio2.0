import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"

export async function executeResetState(conversationId: string): Promise<void> {
  const conv = await prisma.conversation.findUnique({
    where:  { id: conversationId },
    select: { currentStateId: true },
  })
  if (!conv?.currentStateId) throw new Error("Kein aktueller State für Reset")
  await transitionState(conversationId, conv.currentStateId, "ai_advance")
}
