/**
 * Backfill-Script: generiert Embeddings für alle Assets und BrainDocuments
 * ohne vorhandenes Embedding.
 *
 * Voraussetzungen:
 *   - OPENAI_API_KEY in .env gesetzt
 *   - pgvector Extension bereits aktiviert (migration 20260716000000 deployed)
 *
 * Ausführen:
 *   npx ts-node scripts/backfill-embeddings.ts
 *   npx ts-node scripts/backfill-embeddings.ts --boardId=<id>   (nur ein Board)
 *   npx ts-node scripts/backfill-embeddings.ts --only=assets     (nur Assets)
 *   npx ts-node scripts/backfill-embeddings.ts --only=docs       (nur BrainDocuments)
 */

import { PrismaClient } from "@prisma/client"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import OpenAI from "openai"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number }>

const EMBEDDING_MODEL = "text-embedding-3-small"
const BATCH_SIZE = 20   // assets/docs per batch
const DELAY_MS   = 200  // pause between OpenAI calls to stay under rate limits
const MAX_CHARS  = 50_000

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

async function downloadBuffer(r2Key: string): Promise<Buffer> {
  const client = getR2Client()
  const res = await client.send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: r2Key })
  )
  if (!res.Body) throw new Error(`Leerer Body für ${r2Key}`)
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8_000),
    })
    return res.data[0].embedding
  } catch (err) {
    console.error("  ✗ Embedding-API Fehler:", err instanceof Error ? err.message : err)
    return null
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function backfillAssets(boardIdFilter?: string) {
  const where: Record<string, unknown> = { embedding: null }
  if (boardIdFilter) where.boardId = boardIdFilter

  const assets = await (prisma as any).asset.findMany({
    where,
    select: { id: true, name: true, description: true, type: true, r2Key: true, extractedText: true, boardId: true },
    orderBy: { createdAt: "asc" },
  }) as Array<{
    id: string; name: string; description: string | null; type: string
    r2Key: string; extractedText: string | null; boardId: string
  }>

  console.log(`\n[assets] ${assets.length} Assets ohne Embedding`)
  let ok = 0, failed = 0

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]
    process.stdout.write(`  [${i + 1}/${assets.length}] ${a.name} (${a.type}) … `)

    try {
      let extractedText = a.extractedText

      // PDF without extracted text → extract now
      if (a.type === "PDF" && !extractedText) {
        const buf = await downloadBuffer(a.r2Key)
        const data = await pdfParse(buf, { max: 0 })
        extractedText = data.text?.replace(/\s+/g, " ").trim()?.slice(0, MAX_CHARS) ?? null
      }

      const embText = [a.name, a.description, extractedText?.slice(0, 6_000)].filter(Boolean).join("\n\n")
      const emb = await embed(embText)
      if (!emb) { failed++; console.log("✗ kein Embedding"); continue }

      await (prisma as any).asset.update({
        where: { id: a.id },
        data: {
          embedding: `[${emb.join(",")}]`,
          ...(extractedText && !a.extractedText ? { extractedText } : {}),
        },
      })
      console.log("✓")
      ok++
    } catch (err) {
      console.log("✗", err instanceof Error ? err.message : err)
      failed++
    }

    if ((i + 1) % BATCH_SIZE === 0) await sleep(DELAY_MS)
  }

  console.log(`[assets] Fertig: ${ok} OK, ${failed} Fehler`)
}

async function backfillDocs(boardIdFilter?: string) {
  const where: Record<string, unknown> = { embedding: null }
  if (boardIdFilter) where.boardId = boardIdFilter

  const docs = await (prisma as any).brainDocument.findMany({
    where,
    select: { id: true, name: true, content: true, boardId: true },
    orderBy: { createdAt: "asc" },
  }) as Array<{ id: string; name: string; content: string; boardId: string }>

  console.log(`\n[docs] ${docs.length} BrainDocuments ohne Embedding`)
  let ok = 0, failed = 0

  for (let i = 0; i < docs.length; i++) {
    const d = docs[i]
    process.stdout.write(`  [${i + 1}/${docs.length}] ${d.name} … `)

    const emb = await embed(`${d.name}\n\n${d.content}`)
    if (!emb) { failed++; console.log("✗ kein Embedding"); continue }

    try {
      await (prisma as any).brainDocument.update({
        where: { id: d.id },
        data: { embedding: `[${emb.join(",")}]` },
      })
      console.log("✓")
      ok++
    } catch (err) {
      console.log("✗", err instanceof Error ? err.message : err)
      failed++
    }

    if ((i + 1) % BATCH_SIZE === 0) await sleep(DELAY_MS)
  }

  console.log(`[docs] Fertig: ${ok} OK, ${failed} Fehler`)
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[backfill] OPENAI_API_KEY fehlt in .env — Abbruch")
    process.exit(1)
  }

  const boardId = process.argv.find((a) => a.startsWith("--boardId="))?.split("=")[1]
  const only    = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] as "assets" | "docs" | undefined

  console.log(`[backfill] Starte Embedding-Backfill${boardId ? ` für Board ${boardId}` : ""}`)

  if (!only || only === "assets") await backfillAssets(boardId)
  if (!only || only === "docs")   await backfillDocs(boardId)

  console.log("\n[backfill] Alle Backfills abgeschlossen.")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("[backfill] Kritischer Fehler:", err)
  process.exit(1)
})
