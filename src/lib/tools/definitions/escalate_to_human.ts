import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const escalateToHumanTool: Tool = {
  name: "escalate_to_human",
  description:
    "Eskaliert den Lead an einen menschlichen Mitarbeiter und pausiert die KI. Nutze dieses Tool bei: unklarer Anfrage, Beschwerde, hochwertiger Opportunity, oder wenn du nach 3 Versuchen nicht weiterkommst.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        enum: ["unclear_request", "out_of_scope", "complaint", "high_value_opportunity", "other"],
        description: "Grund für die Eskalation",
      },
      summary: {
        type: "string",
        description: "1-2 Sätze Zusammenfassung für den Mitarbeiter",
      },
      urgency: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "Dringlichkeit",
      },
    },
    required: ["reason", "summary", "urgency"],
  },

  async execute({
    args,
    conversation,
    board,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const { reason, summary, urgency } = args as { reason: string; summary: string; urgency: string }

    if (context.simulate) {
      return { success: true, data: { escalated: true, reason, urgency }, nextAction: "escalate" }
    }

    try {
      // Create admin notification
      await prisma.adminNotification.create({
        data: {
          boardId: board.id,
          conversationId: conversation.id,
          type: `escalation_${reason}`,
          message: `[${urgency.toUpperCase()}] ${summary}`,
        },
      })

      // Freeze the conversation so AI stops responding
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          frozen: true,
          frozenAt: new Date(),
          frozenReason: `Eskalation: ${reason} — ${summary}`,
          frozenBy: "ai_agent",
        },
      })

      return {
        success: true,
        data: { escalated: true, reason, urgency },
        nextAction: "escalate",
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Eskalation fehlgeschlagen" }
    }
  },
}
