import { prisma } from "@/lib/db"
import { sendMessage } from "@/lib/messaging/dispatcher"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const sendTemplateTool: Tool = {
  name: "send_template",
  description:
    "Sendet ein vorkonfiguriertes Template (z.B. Begrüßung, Angebot, Broschüre) an den Lead. Variablen im Template werden automatisch ersetzt.",
  parameters: {
    type: "object",
    properties: {
      templateId: {
        type: "string",
        description: "ID des BoardAssets mit type=TEMPLATE",
      },
      variables: {
        type: "object",
        description: "Variablen die in {{placeholder}} Platzhalter im Template eingesetzt werden",
      },
    },
    required: ["templateId"],
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
    const templateId = args.templateId as string
    const variables = (args.variables as Record<string, string>) ?? {}

    const asset = await prisma.boardAsset.findFirst({
      where: { id: templateId, boardId: board.id, type: "TEMPLATE", isActive: true },
      select: { id: true, name: true, content: true },
    })

    if (!asset?.content) {
      return { success: false, error: `Template '${templateId}' nicht gefunden oder leer` }
    }

    // Interpolate {{variable}} placeholders
    let text = asset.content
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
    }

    if (context.simulate) {
      return { success: true, data: { templateName: asset.name, renderedText: text } }
    }

    try {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          content: text,
          messageType: "TEMPLATE",
          status: "SENT",
          aiGenerated: true,
          metadata: { templateId: asset.id, templateName: asset.name },
        },
      })

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })

      const sendResult = await sendMessage(conversation.id, text)
      if (!sendResult.ok) {
        return { success: false, error: `Versand fehlgeschlagen: ${sendResult.error}` }
      }

      return { success: true, data: { templateName: asset.name, messageId: sendResult.externalMessageId } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
