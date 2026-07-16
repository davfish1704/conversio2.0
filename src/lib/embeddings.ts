import OpenAI from "openai"
import { prisma } from "@/lib/db"

export const EMBEDDING_MODEL = "text-embedding-3-small"
export const EMBEDDING_DIMS  = 1536
export const SIMILARITY_THRESHOLD = 0.70

// Cached client — null if OPENAI_API_KEY is missing
let _client: OpenAI | null | undefined = undefined

function getClient(): OpenAI | null {
  if (_client !== undefined) return _client
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    console.warn("[embeddings] OPENAI_API_KEY nicht konfiguriert — semantische Suche deaktiviert")
    _client = null
  } else {
    _client = new OpenAI({ apiKey: key })
  }
  return _client
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getClient()
  if (!client) return null
  try {
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8_000),
    })
    return res.data[0].embedding
  } catch (err) {
    console.error("[embeddings] Embedding-Generierung fehlgeschlagen:", err instanceof Error ? err.message : err)
    return null
  }
}

/** Text to embed for an Asset (name + description + extracted PDF text) */
export function assetEmbeddingText(asset: {
  name: string
  description?: string | null
  extractedText?: string | null
}): string {
  return [asset.name, asset.description, asset.extractedText?.slice(0, 6_000)]
    .filter(Boolean)
    .join("\n\n")
}

const VALID_ASSET_TYPES = new Set(["IMAGE", "PDF", "AUDIO", "VIDEO", "DOCUMENT"])

export type SemanticAssetResult = {
  id: string
  name: string
  type: string
  publicUrl: string
  description: string | null
  tags: string[]
}

/**
 * Cosine similarity search on the assets table.
 * Falls back to empty array (no throw) so callers can use ILIKE fallback.
 */
export async function semanticAssetSearch(params: {
  boardId: string
  embedding: number[]
  assetType?: string
  limit?: number
  threshold?: number
}): Promise<SemanticAssetResult[]> {
  const { boardId, embedding, assetType, limit = 10, threshold = SIMILARITY_THRESHOLD } = params
  const vectorStr  = `[${embedding.join(",")}]`
  const typeClause = assetType && VALID_ASSET_TYPES.has(assetType)
    ? `AND type = '${assetType}'::"AssetType"` : ""

  try {
    const rows = await prisma.$queryRawUnsafe<SemanticAssetResult[]>(
      `SELECT id, name, type, "publicUrl", description, tags
       FROM assets
       WHERE "boardId" = $1
         AND embedding IS NOT NULL
         AND (1 - (embedding <=> $2::vector)) > $3
         ${typeClause}
       ORDER BY embedding <=> $2::vector
       LIMIT ${limit}`,
      boardId, vectorStr, threshold,
    )
    return rows
  } catch (err) {
    console.error("[embeddings] semanticAssetSearch fehlgeschlagen:", err instanceof Error ? err.message : err)
    return []
  }
}

export type SemanticDocResult = {
  id: string
  name: string
  content: string
}

/**
 * Cosine similarity search on the brain_documents table.
 * Falls back to empty array so caller can use full-load fallback.
 */
export async function semanticDocSearch(params: {
  boardId: string
  embedding: number[]
  limit?: number
  threshold?: number
}): Promise<SemanticDocResult[]> {
  const { boardId, embedding, limit = 5, threshold = SIMILARITY_THRESHOLD } = params
  const vectorStr = `[${embedding.join(",")}]`

  try {
    const rows = await prisma.$queryRawUnsafe<SemanticDocResult[]>(
      `SELECT id, name, content
       FROM brain_documents
       WHERE "boardId" = $1
         AND embedding IS NOT NULL
         AND (1 - (embedding <=> $2::vector)) > $3
       ORDER BY embedding <=> $2::vector
       LIMIT $4`,
      boardId, vectorStr, threshold, limit,
    )
    return rows
  } catch (err) {
    console.error("[embeddings] semanticDocSearch fehlgeschlagen:", err instanceof Error ? err.message : err)
    return []
  }
}
