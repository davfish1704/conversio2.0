import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const board = await prisma.board.findFirst({
    where: {
      id: params.id,
      members: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { states: true, members: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  })

  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ board })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, isActive } = body

  const membership = await prisma.boardMember.findFirst({
    where: {
      boardId: params.id,
      userId: session.user.id,
      role: { in: ["ADMIN", "AGENT"] },
    },
  })

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const board = await prisma.board.update({
    where: { id: params.id },
    data: {
      name,
      description: description || null,
      isActive: isActive !== undefined ? isActive : undefined,
    },
  })

  return NextResponse.json({ board })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const membership = await prisma.boardMember.findFirst({
    where: {
      boardId: params.id,
      userId: session.user.id,
      role: "ADMIN",
    },
  })

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // ExecutionLog → Conversation has no onDelete cascade; must clean up manually
  await prisma.$transaction(async (tx) => {
    const convIds = await tx.conversation
      .findMany({ where: { boardId: params.id }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id))

    if (convIds.length > 0) {
      await tx.executionLog.deleteMany({ where: { conversationId: { in: convIds } } })
    }

    await tx.board.delete({ where: { id: params.id } })
  })

  return NextResponse.json({ success: true })
}
