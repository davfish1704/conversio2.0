import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const setLeadScoreTool: Tool = {
  name: "set_lead_score",
  description:
    "Bewertet die Qualität und Kaufbereitschaft des Leads mit einem Score von 0-100. Nutze dieses Tool nach dem Sammeln relevanter Informationen.",
  parameters: {
    type: "object",
    properties: {
      score: {
        type: "number",
        minimum: 0,
        maximum: 100,
        description: "Score 0-100. 0-30 = kalter Lead, 31-60 = warm, 61-100 = heiß",
      },
      reasoning: {
        type: "string",
        description: "Kurze Begründung für den Score",
      },
    },
    required: ["score", "reasoning"],
  },

  async execute({
    args,
    conversation,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const score = Number(args.score)
    const reasoning = args.reasoning as string

    if (isNaN(score) || score < 0 || score > 100) {
      return { success: false, error: "Score muss zwischen 0 und 100 liegen" }
    }

    if (context.simulate) {
      return { success: true, data: { score, reasoning } }
    }

    try {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { leadScore: Math.round(score) },
      })

      // Persist reasoning in memory for future context
      await prisma.conversationMemory.upsert({
        where: { conversationId_key: { conversationId: conversation.id, key: "lead_score_reasoning" } },
        update: { value: `Score ${score}: ${reasoning}` },
        create: { conversationId: conversation.id, key: "lead_score_reasoning", value: `Score ${score}: ${reasoning}` },
      })

      return { success: true, data: { score: Math.round(score), reasoning } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Score konnte nicht gespeichert werden" }
    }
  },
}
