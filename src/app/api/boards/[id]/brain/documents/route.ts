import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"
import { generateEmbedding } from "@/lib/embeddings"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    try { await assertBoardAccess({ userId: session.user.id, boardId: id }) } catch (e) { return toNextResponse(e) }

    const documents = await prisma.brainDocument.findMany({
      where: { boardId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Brain documents GET error:", error)
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    try { await assertBoardAccess({ userId: session.user.id, boardId: id }) } catch (e) { return toNextResponse(e) }

    const { name, content, category = "general" } = await req.json()

    if (!name || !content) {
      return NextResponse.json({ error: "Name and content required" }, { status: 400 })
    }

    const document = await prisma.brainDocument.create({
      data: {
        boardId: id,
        name,
        content,
        category,
      },
    })

    // Embedding generieren und speichern (fire-and-forget)
    generateEmbedding(`${name}\n\n${content}`)
      .then((emb) => {
        if (!emb) return
        return (prisma as any).brainDocument.update({
          where: { id: document.id },
          data: { embedding: `[${emb.join(",")}]` },
        })
      })
      .catch((err) => console.error("[brain-docs] Embedding fehlgeschlagen:", err))

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error("Brain documents POST error:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    try { await assertBoardAccess({ userId: session.user.id, boardId: id }) } catch (e) { return toNextResponse(e) }

    const { id: docId } = await req.json()
    if (!docId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    await prisma.brainDocument.delete({ where: { id: docId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Brain documents DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
