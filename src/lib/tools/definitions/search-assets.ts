import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const searchAssetsTool: Tool = {
  name: "search_assets",
  description:
    "Sucht in der Asset-Bibliothek des Boards nach Bildern, PDFs oder Dokumenten. " +
    "Verwende dieses Tool wenn der Kunde etwas sehen möchte (Fotos, Grundrisse, Verträge) " +
    "oder wenn relevante Medien das Gespräch voranbringen würden. " +
    "Gibt Asset-URLs zurück, die du direkt an den Kunden senden kannst.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natürlichsprachliche Beschreibung des gesuchten Assets",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Optionaler Filter nach exakten Tags",
      },
      assetType: {
        type: "string",
        enum: ["IMAGE", "PDF", "AUDIO", "VIDEO", "DOCUMENT"],
        description: "Optionaler Filter nach Asset-Typ",
      },
      limit: {
        type: "number",
        description: "Maximale Anzahl Ergebnisse (Standard: 5)",
      },
    },
    required: ["query"],
  },

  async execute({
    args,
    context,
    state,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const query = args.query as string | undefined
    if (!query) return { success: false, error: "query fehlt" }

    const tags    = args.tags as string[] | undefined
    const type    = args.assetType as string | undefined
    const limit   = Math.min(Number(args.limit ?? 5), 20)

    try {
      // Stage-linked assets rank first — fetch them separately, then fill with board-wide results
      const stageLinked = await prisma.asset.findMany({
        where: {
          boardId: context.boardId,
          links:   { some: { stateId: state.id } },
          ...(type  ? { type: type as "IMAGE" | "PDF" | "AUDIO" | "VIDEO" | "DOCUMENT" } : {}),
          ...(tags?.length ? { tags: { hasSome: tags } } : {}),
          OR: [
            { name:        { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { tags:        { hasSome: [query] } },
          ],
        },
        select: { id: true, name: true, type: true, publicUrl: true, description: true, tags: true },
        take: limit,
      })

      const remaining = limit - stageLinked.length
      const stageLinkedIds = stageLinked.map((a) => a.id)

      const boardWide =
        remaining > 0
          ? await prisma.asset.findMany({
              where: {
                boardId: context.boardId,
                id:      { notIn: stageLinkedIds },
                ...(type  ? { type: type as "IMAGE" | "PDF" | "AUDIO" | "VIDEO" | "DOCUMENT" } : {}),
                ...(tags?.length ? { tags: { hasSome: tags } } : {}),
                OR: [
                  { name:        { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  { tags:        { hasSome: [query] } },
                ],
              },
              select: { id: true, name: true, type: true, publicUrl: true, description: true, tags: true },
              take: remaining,
            })
          : []

      const assets = [...stageLinked, ...boardWide]

      if (assets.length === 0) {
        return {
          success: true,
          data: { assets: [], message: `Keine Assets gefunden für: '${query}'` },
        }
      }

      return {
        success: true,
        data: {
          assets: assets.map((a) => ({
            id:          a.id,
            name:        a.name,
            type:        a.type,
            publicUrl:   a.publicUrl,
            description: a.description ?? null,
            tags:        a.tags,
          })),
        },
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }
    }
  },
}
