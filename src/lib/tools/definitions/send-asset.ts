import { prisma } from "@/lib/db"
import { sendMediaMessage } from "@/lib/messaging/dispatcher"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const sendAssetTool: Tool = {
  name: "send_asset",
  description:
    "Sendet ein Asset (Bild, PDF, Audio, Video, Dokument) als Mediendatei an den Kunden. " +
    "Rufe search_assets IMMER VOR send_asset auf, um gültige Asset-IDs zu erhalten. " +
    "Nutze dieses Tool SOFORT in folgenden Situationen:\n" +
    "- Der Kunde fragt nach Preisen, Kosten, Finanzierung → suche nach Preisliste/Kostenaufstellung\n" +
    "- Der Kunde fragt nach Fotos, Bildern, Grundrissen, Lageplänen → suche nach Bildern/Grundrissen\n" +
    "- Der Kunde fragt nach Broschüren, Prospekten, Flyern, Katalogen → suche nach dem passenden Dokument\n" +
    "- Der Kunde fragt nach Verträgen, Formularen, Anträgen → suche nach Vertrag/Formular\n" +
    "- Der Kunde zeigt Interesse an einer bestimmten Immobilie → suche nach dem Objektnamen\n" +
    "GIBS NICHT nur die URL zurück — das Asset muss via dieses Tools versendet werden.",
  parameters: {
    type: "object",
    properties: {
      assetId: {
        type: "string",
        description: "Die ID des Assets (vorher via search_assets ermittelt)",
      },
      caption: {
        type: "string",
        description: "Begleittext für den Kunden. Erklärt kurz, was er bekommt (z.B. 'Hier ist die Preisliste für unsere Objekte in Canggu.')",
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
    if (!assetId) return { success: false, error: "assetId fehlt" }

    const caption = args.caption as string | undefined

    try {
      const asset = await prisma.asset.findFirst({
        where: { id: assetId, boardId: context.boardId },
        select: { id: true, name: true, type: true, publicUrl: true, mimeType: true },
      })

      if (!asset) {
        return {
          success: false,
          error: `Asset nicht gefunden (assetId: ${assetId})`,
        }
      }

      if (context.simulate) {
        return {
          success: true,
          data: { assetName: asset.name, assetType: asset.type, url: asset.publicUrl },
        }
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "OUTBOUND",
          content: caption ?? asset.name,
          messageType: "TEXT",
          status: "SENT",
          aiGenerated: true,
          metadata: { assetId: asset.id, assetType: asset.type, publicUrl: asset.publicUrl },
        },
      })

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })

      const dispatchResult = await sendMediaMessage(conversation.id, {
        url:      asset.publicUrl,
        mimeType: asset.mimeType,
        filename: asset.name,
        caption,
      })

      if (!dispatchResult.ok) {
        return { success: false, error: `Asset-Versand fehlgeschlagen — ${dispatchResult.error}` }
      }

      return { success: true, data: { assetName: asset.name, assetType: asset.type } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
