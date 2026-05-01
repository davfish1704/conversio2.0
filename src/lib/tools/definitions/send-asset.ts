import { prisma } from "@/lib/db"
import { sendMessage as dispatchMessage } from "@/lib/messaging/dispatcher"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const sendAssetTool: Tool = {
  name: "send_asset",
  description:
    "Sendet ein Board-Asset (Dokument, Bild, Text-Snippet) an den Kunden. Verwende search_assets um gültige Asset-IDs zu finden.",
  parameters: {
    type: "object",
    properties: {
      assetId: {
        type: "string",
        description: "Die ID des BoardAssets",
      },
    },
    required: ["assetId"],
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
    const assetId = args.assetId as string | undefined
    if (!assetId) {
      return { success: false, error: "assetId fehlt" }
    }

    try {
      const asset = await prisma.boardAsset.findFirst({
        where: { id: assetId, boardId: context.boardId, isActive: true },
        select: { id: true, name: true, type: true, content: true, fileUrl: true },
      })

      if (!asset) {
        return {
          success: false,
          error: `Asset nicht gefunden oder gehört nicht zu diesem Board (assetId: ${assetId})`,
        }
      }

      const sendContent = asset.fileUrl ?? asset.content
      if (!sendContent) {
        return { success: false, error: `Asset '${asset.name}' hat weder Datei-URL noch Textinhalt` }
      }

      const messageText =
        asset.type === "TEXT_SNIPPET" || asset.type === "KNOWLEDGE_BASE" || asset.type === "TEMPLATE"
          ? sendContent
          : `📎 ${asset.name}: ${sendContent}`

      if (context.simulate) {
        return { success: true, data: { assetName: asset.name, assetType: asset.type, preview: messageText.slice(0, 80) } }
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          content: messageText,
          messageType: "TEXT",
          status: "SENT",
          aiGenerated: true,
          metadata: { assetId: asset.id, assetType: asset.type },
        },
      })

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })

      const dispatchResult = await dispatchMessage(conversation.id, messageText)
      if (!dispatchResult.ok) {
        return { success: false, error: `Asset-Versand fehlgeschlagen — ${dispatchResult.error}` }
      }

      return { success: true, data: { assetName: asset.name } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
