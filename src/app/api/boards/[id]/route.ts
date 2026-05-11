import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let board
  try {
    await assertBoardAccess({ userId: session.user.id, boardId: params.id })
    board = await prisma.board.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { states: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    })
  } catch (e) {
    return toNextResponse(e)
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

  try {
    await assertBoardAccess({ userId: session.user.id, boardId: params.id })
  } catch (e) {
    return toNextResponse(e)
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

  try {
    await assertBoardAccess({ userId: session.user.id, boardId: params.id })
  } catch (e) {
    return toNextResponse(e)
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
