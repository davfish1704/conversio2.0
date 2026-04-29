import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

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
    const board = await prisma.board.findFirst({
      where: { id, members: { some: { userId: session.user.id } } },
    })
    if (!board) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

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
    const board = await prisma.board.findFirst({
      where: { id, members: { some: { userId: session.user.id } } },
    })
    if (!board) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

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

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error("Brain documents POST error:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
