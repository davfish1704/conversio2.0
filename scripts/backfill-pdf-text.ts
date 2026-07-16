/**
 * Backfill-Script: extrahiert PDF-Volltext für alle Assets ohne extractedText.
 * Einmalig ausführen nach der Migration mit:
 *   npx ts-node scripts/backfill-pdf-text.ts
 * Optional: spezifisches Board mit --boardId=<id> filtern.
 */

import { PrismaClient } from "@prisma/client"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number }>

const prisma = new PrismaClient()

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
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
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function main() {
  const boardIdFilter = process.argv.find((a) => a.startsWith("--boardId="))?.split("=")[1]

  const where: Record<string, unknown> = {
    type: "PDF",
    extractedText: null,
  }
  if (boardIdFilter) where.boardId = boardIdFilter

  const assets = await (prisma as any).asset.findMany({
    where,
    select: { id: true, name: true, r2Key: true, boardId: true },
    orderBy: { createdAt: "asc" },
  }) as Array<{ id: string; name: string; r2Key: string; boardId: string }>

  console.log(`[backfill] ${assets.length} PDFs ohne extrahierten Text gefunden`)

  let ok = 0
  let failed = 0

  for (const asset of assets) {
    try {
      console.log(`[backfill] → ${asset.name} (${asset.id})`)
      const buffer = await downloadBuffer(asset.r2Key)
      const data = await pdfParse(buffer, { max: 0 })
      const text = data.text?.replace(/\s+/g, " ").trim()
      if (!text) {
        console.log(`  ⚠ Kein Text extrahierbar (gescanntes PDF?)`)
        failed++
        continue
      }
      const truncated = text.slice(0, 50_000)
      await (prisma as any).asset.update({
        where: { id: asset.id },
        data: { extractedText: truncated },
      })
      console.log(`  ✓ ${truncated.length} Zeichen extrahiert (${data.numpages} Seiten)`)
      ok++
    } catch (err) {
      console.error(`  ✗ Fehler:`, err instanceof Error ? err.message : err)
      failed++
    }
  }

  console.log(`\n[backfill] Fertig: ${ok} OK, ${failed} Fehler`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("[backfill] Kritischer Fehler:", err)
  process.exit(1)
})
