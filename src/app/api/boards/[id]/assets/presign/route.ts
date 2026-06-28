import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPresignedUploadUrl } from "@/lib/r2"
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validators/asset"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

function slugify(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })

  const { fileName, contentType, size } = body as Record<string, unknown>

  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName fehlt" }, { status: 400 })
  }
  if (!contentType || typeof contentType !== "string" || !ALLOWED_MIME_TYPES[contentType]) {
    return NextResponse.json({ error: `Dateityp nicht erlaubt: ${contentType ?? "—"}` }, { status: 400 })
  }
  if (typeof size !== "number" || size <= 0) {
    return NextResponse.json({ error: "Ungültige Dateigröße" }, { status: 400 })
  }
  if (size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Datei zu groß (max. 25 MB)" }, { status: 400 })
  }

  const uid = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
  const r2Key = `boards/${params.id}/${uid}-${slugify(fileName)}`

  try {
    const presignedUrl = await getPresignedUploadUrl(r2Key, contentType, 900)
    return NextResponse.json({ presignedUrl, r2Key })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[asset-presign]", err)
    return NextResponse.json(
      { error: msg.startsWith("Missing required env var") ? `R2-Konfiguration fehlt — ${msg}` : `Presign fehlgeschlagen: ${msg}` },
      { status: 500 },
    )
  }
}
