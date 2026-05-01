import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const searchAssetsTool: Tool = {
  name: "search_assets",
  description:
    "Sucht nach Board-Assets anhand von Stichwörtern. Gibt Asset-IDs und Namen zurück die für send_asset genutzt werden können.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Suchbegriff für Asset-Name oder Tags",
      },
      type: {
        type: "string",
        enum: ["AUDIO_MEMO", "PDF_DOC", "IMAGE_ASSET", "TEXT_SNIPPET", "TEMPLATE", "KNOWLEDGE_BASE"],
        description: "Optionaler Filter nach Asset-Typ",
      },
    },
    required: ["query"],
  },

  async execute({
    args,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const query = args.query as string | undefined
    if (!query) {
      return { success: false, error: "query fehlt" }
    }

    try {
      const assets = await prisma.boardAsset.findMany({
        where: {
          boardId: context.boardId,
          isActive: true,
          ...(args.type ? { type: args.type as never } : {}),
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { tags: { hasSome: [query] } },
          ],
        },
        select: { id: true, name: true, type: true, tags: true },
        take: 10,
      })

      if (assets.length === 0) {
        return { success: true, data: { assets: [], message: `Keine Assets gefunden für Query: '${query}'` } }
      }

      return {
        success: true,
        data: {
          assets: assets.map((a) => ({ id: a.id, name: a.name, type: a.type, tags: a.tags })),
        },
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
