import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadToR2 } from "@/lib/r2"
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validators/asset"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

function slugify(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Ungültiges Multipart-Formular" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Datei zu groß (max. 25 MB)" }, { status: 400 })
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Leere Datei" }, { status: 400 })
  }

  const assetType = ALLOWED_MIME_TYPES[file.type]
  if (!assetType) {
    return NextResponse.json(
      { error: `Dateityp nicht unterstützt: ${file.type}` },
      { status: 400 }
    )
  }

  const name        = (formData.get("name") as string | null)?.trim() || file.name
  const description = (formData.get("description") as string | null)?.trim() || null
  const tagsRaw     = formData.get("tags") as string | null
  const tags        = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : []

  const uid    = crypto.randomUUID().replace(/-/g, "").slice(0, 12)
  const r2Key  = `boards/${params.id}/${uid}-${slugify(file.name)}`

  try {
    const buffer    = Buffer.from(await file.arrayBuffer())
    const publicUrl = await uploadToR2(r2Key, buffer, file.type)

    const asset = await prisma.asset.create({
      data: {
        boardId:     params.id,
        name,
        description,
        type:        assetType,
        mimeType:    file.type,
        sizeBytes:   file.size,
        r2Key,
        publicUrl,
        tags,
        uploadedBy:  session.user.id,
      },
      include: { links: { select: { stateId: true } } },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    console.error("[asset-upload]", err)
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 })
  }
}
