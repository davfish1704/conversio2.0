import { prisma } from "@/lib/db"
import { transitionState } from "@/lib/state-machine"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const advanceStateTool: Tool = {
  name: "advance_state",
  description:
    "Wechselt den Lead in einen anderen State des Funnels. Nutze dieses Tool wenn alle Kriterien des aktuellen States erfüllt sind.",
  parameters: {
    type: "object",
    properties: {
      targetStateName: {
        type: "string",
        description: "Exakter Name des Ziel-States (wie im Flow Builder definiert)",
      },
      reason: {
        type: "string",
        description: "Kurze Begründung warum jetzt gewechselt wird",
      },
    },
    required: ["targetStateName", "reason"],
  },

  async execute({
    args,
    conversation,
    board,
    state: currentState,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const targetStateName = args.targetStateName as string
    if (!targetStateName?.trim()) {
      return { success: false, error: "targetStateName darf nicht leer sein" }
    }

    // Find target state by name within this board
    const targetState = await prisma.state.findFirst({
      where: { boardId: board.id, name: { equals: targetStateName, mode: "insensitive" }, isActive: true },
      select: { id: true, name: true },
    })

    if (!targetState) {
      // Return available state names to help the AI pick correctly
      const available = await prisma.state.findMany({
        where: { boardId: board.id, isActive: true },
        select: { name: true },
        orderBy: { orderIndex: "asc" },
      })
      return {
        success: false,
        error: `State '${targetStateName}' nicht gefunden. Verfügbare States: ${available.map((s) => s.name).join(", ")}`,
      }
    }

    // Prevent self-transition
    if (targetState.id === currentState.id) {
      return { success: false, error: "Bereits in diesem State" }
    }

    if (context.simulate) {
      return { success: true, data: { transitioned: true, targetState: targetState.name } }
    }

    await transitionState(conversation.id, targetState.id)

    return {
      success: true,
      data: { transitioned: true, targetState: targetState.name, reason: args.reason },
      nextAction: "continue",
    }
  },
}
