import { prisma } from "@/lib/db"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"
import { generateEmbedding, semanticAssetSearch } from "@/lib/embeddings"

export const searchAssetsTool: Tool = {
  name: "search_assets",
  description:
    "Sucht in der Asset-Bibliothek des Boards nach Bildern, PDFs oder Dokumenten — " +
    "inklusive des extrahierten Volltexts aus PDFs. Verwende dieses Tool SOFORT wenn der Lead " +
    "nach Preisen, Kosten, ROI, Rendite, Leasehold, Zahlungsplan, Fotos, Grundrissen, Broschüren oder Verträgen fragt. " +
    "Gibt Asset-IDs und publicUrls zurück, die du dann mit send_asset versenden kannst.\n\n" +
    "WICHTIG — Rufe dieses Tool NUR EINMAL pro Anfrage auf. " +
    "Schreibe NICHT '[Searching assets...]' — das ist vorgetäuschtes Verhalten. Benutze diesen echten Tool-Aufruf.\n\n" +
    "WENN KEINE ASSETS GEFUNDEN WERDEN: Sage dem Lead EHRLICH und DIREKT, dass du die " +
    "gesuchten Informationen oder Dokumente gerade nicht in der Bibliothek hast. " +
    "ERFINDE KEINE Zahlen, Preise, ROI-Werte oder Konditionen als Ersatz. " +
    "Biete stattdessen an, einen menschlichen Ansprechpartner zu verbinden (escalate_to_supervisor). " +
    "Rufe search_assets NICHT wiederholt mit anderen Suchbegriffen auf — " +
    "das Ergebnis bleibt gleich und der Suchraum ist vollständig.",
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
      let assets: Array<{ id: string; name: string; type: string; publicUrl: string; description: string | null; tags: string[] }> = []

      // ── Semantic path ──────────────────────────────────────────────────────
      const queryEmbedding = await generateEmbedding(query).catch(() => null)
      if (queryEmbedding) {
        assets = await semanticAssetSearch({
          boardId:   context.boardId,
          embedding: queryEmbedding,
          assetType: type,
          limit,
          threshold: 0.65,
        })
        if (tags?.length) {
          assets = assets.filter((a) => tags.some((t) => a.tags.includes(t)))
        }
      }

      // ── ILIKE fallback (when semantic returned nothing or embedding unavailable) ──
      if (assets.length === 0) {
        // Stage-linked assets rank first
        const stageLinked = await (prisma as any).asset.findMany({
          where: {
            boardId: context.boardId,
            links:   { some: { stateId: state.id } },
            ...(type  ? { type } : {}),
            ...(tags?.length ? { tags: { hasSome: tags } } : {}),
            OR: [
              { name:          { contains: query, mode: "insensitive" } },
              { description:   { contains: query, mode: "insensitive" } },
              { tags:          { hasSome: [query] } },
              { extractedText: { contains: query, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, type: true, publicUrl: true, description: true, tags: true },
          take: limit,
        })

        const remaining      = limit - stageLinked.length
        const stageLinkedIds = stageLinked.map((a: { id: string }) => a.id)

        const boardWide =
          remaining > 0
            ? await (prisma as any).asset.findMany({
                where: {
                  boardId: context.boardId,
                  id:      { notIn: stageLinkedIds },
                  ...(type  ? { type } : {}),
                  ...(tags?.length ? { tags: { hasSome: tags } } : {}),
                  OR: [
                    { name:          { contains: query, mode: "insensitive" } },
                    { description:   { contains: query, mode: "insensitive" } },
                    { extractedText: { contains: query, mode: "insensitive" } },
                    { tags:          { hasSome: [query] } },
                  ],
                },
                select: { id: true, name: true, type: true, publicUrl: true, description: true, tags: true },
                take: remaining,
              })
            : []

        assets = [...stageLinked, ...boardWide]
      }

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
