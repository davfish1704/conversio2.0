import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: params.id,
        members: { some: { userId: session.user.id } },
      },
      select: { name: true },
    })

    if (!board) {
      return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)
    }

    const states = await prisma.state.findMany({
      where: { boardId: params.id },
      orderBy: { orderIndex: 'asc' },
    })

    return NextResponse.json({ boardName: board.name, states })
  } catch (error) {
    console.error("States API error:", error)
    return jsonError("States could not be loaded. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const body = await req.json()
    const { name, orderIndex, mission, type, rules, nextStateId, config } = body

    if (!name) {
      return jsonError("Name is required.", "INVALID_INPUT", 400)
    }

    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'AGENT'] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    const state = await prisma.state.create({
      data: {
        name,
        boardId: params.id,
        orderIndex: orderIndex ?? 0,
        mission: mission || null,
        type: type || 'MESSAGE',
        rules: rules || null,
        nextStateId: nextStateId || null,
        config: config || null,
      },
    })

    return NextResponse.json({ state }, { status: 201 })
  } catch (error) {
    console.error("State create error:", error)
    return jsonError("State could not be created. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const body = await req.json()
    const { id: stateId, name, mission, type, rules, orderIndex, nextStateId, config } = body

    if (!stateId) {
      return jsonError("State ID is required.", "INVALID_INPUT", 400)
    }

    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'AGENT'] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    const state = await prisma.state.update({
      where: { id: stateId },
      data: {
        name,
        mission: mission || null,
        type: type || 'MESSAGE',
        rules: rules || null,
        orderIndex: orderIndex !== undefined ? orderIndex : undefined,
        nextStateId: nextStateId !== undefined ? (nextStateId || null) : undefined,
        config: config !== undefined ? (config || null) : undefined,
      },
    })

    return NextResponse.json({ state })
  } catch (error) {
    console.error("State update error:", error)
    return jsonError("State could not be updated. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const { searchParams } = new URL(req.url)
    const stateId = searchParams.get('stateId')

    if (!stateId) {
      return jsonError("State ID is required.", "INVALID_INPUT", 400)
    }

    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'AGENT'] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    await prisma.state.delete({
      where: { id: stateId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("State delete error:", error)
    return jsonError("State could not be deleted. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
