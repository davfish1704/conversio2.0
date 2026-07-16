import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { ALLOWED_MIME_TYPES } from "@/lib/validators/asset"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"
import { downloadFromR2 } from "@/lib/r2"
import { extractPdfText } from "@/lib/pdf/extract-text"
import { generateEmbedding, assetEmbeddingText } from "@/lib/embeddings"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })

  const { r2Key, name, size, contentType, description, tags } = body as {
    r2Key?: string
    name?: string
    size?: number
    contentType?: string
    description?: string
    tags?: string[]
  }

  if (!r2Key || typeof r2Key !== "string") return NextResponse.json({ error: "r2Key fehlt" }, { status: 400 })
  if (!name || typeof name !== "string") return NextResponse.json({ error: "name fehlt" }, { status: 400 })
  if (typeof size !== "number" || size <= 0) return NextResponse.json({ error: "Ungültige Dateigröße" }, { status: 400 })
  if (!contentType || !ALLOWED_MIME_TYPES[contentType]) return NextResponse.json({ error: `Unbekannter Dateityp: ${contentType}` }, { status: 400 })

  // Security: r2Key must be scoped to this board — prevents cross-board asset injection
  if (!r2Key.startsWith(`boards/${params.id}/`)) {
    return NextResponse.json({ error: "Ungültiger R2-Pfad" }, { status: 400 })
  }

  const r2PublicUrl = process.env.R2_PUBLIC_URL
  if (!r2PublicUrl) {
    return NextResponse.json({ error: "R2_PUBLIC_URL ist nicht konfiguriert — Asset kann nicht gespeichert werden" }, { status: 500 })
  }
  const publicUrl = `${r2PublicUrl}/${r2Key}`

  try {
    const asset = await prisma.asset.create({
      data: {
        boardId: params.id,
        name: name.trim(),
        description: description?.trim() || null,
        type: ALLOWED_MIME_TYPES[contentType],
        mimeType: contentType,
        sizeBytes: size,
        r2Key,
        publicUrl,
        tags: Array.isArray(tags) ? tags : [],
        uploadedBy: session.user.id,
      },
      include: { links: { select: { stateId: true } } },
    })
    // PDF-Volltext extrahieren + Embedding generieren (fire-and-forget)
    if (contentType === "application/pdf") {
      downloadFromR2(r2Key)
        .then(async (buffer) => {
          const text = await extractPdfText(buffer)
          const updates: Record<string, unknown> = {}
          if (text) updates.extractedText = text
          const embText = assetEmbeddingText({ name, description, extractedText: text })
          const emb = await generateEmbedding(embText)
          if (emb) updates.embedding = `[${emb.join(",")}]`
          if (Object.keys(updates).length) {
            return (prisma as any).asset.update({ where: { id: asset.id }, data: updates })
          }
        })
        .catch((err) => console.error("[asset-confirm] PDF-Indexierung fehlgeschlagen:", err))
    } else {
      // Nicht-PDF-Assets: Embedding aus Name + Beschreibung
      const embText = assetEmbeddingText({ name, description })
      generateEmbedding(embText)
        .then((emb) => {
          if (!emb) return
          return (prisma as any).asset.update({
            where: { id: asset.id },
            data: { embedding: `[${emb.join(",")}]` },
          })
        })
        .catch((err) => console.error("[asset-confirm] Embedding fehlgeschlagen:", err))
    }

    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[asset-confirm]", err)
    return NextResponse.json({ error: `Asset konnte nicht gespeichert werden: ${msg}` }, { status: 500 })
  }
}
