import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { ALLOWED_MIME_TYPES } from "@/lib/validators/asset"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

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

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`

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
    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[asset-confirm]", err)
    return NextResponse.json({ error: `Asset konnte nicht gespeichert werden: ${msg}` }, { status: 500 })
  }
}
