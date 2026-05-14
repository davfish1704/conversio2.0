import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"

export async function executeForceHandoff(
  conversationId: string,
  actionParams: Record<string, unknown>,
): Promise<void> {
  const targetStateId = actionParams.targetStateId as string | undefined

  if (targetStateId) {
    await transitionState(conversationId, targetStateId, "ai_advance")
    return
  }

  // Fallback: nächsten State aus State.nextStateId nehmen
  const conv = await prisma.conversation.findUnique({
    where:   { id: conversationId },
    include: { currentState: { select: { nextStateId: true } } },
  })

  const nextStateId = conv?.currentState?.nextStateId
  if (!nextStateId) throw new Error("Kein nextStateId für Force-Handoff")

  await transitionState(conversationId, nextStateId, "ai_advance")
}
