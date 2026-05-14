import { transitionState } from "@/lib/state-machine"

export async function executeReassignToState(
  conversationId: string,
  actionParams: Record<string, unknown>,
): Promise<void> {
  const targetStateId = actionParams.targetStateId as string | undefined
  if (!targetStateId) throw new Error("actionParams.targetStateId fehlt")
  await transitionState(conversationId, targetStateId, "ai_advance")
}
