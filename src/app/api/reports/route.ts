import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { assertReportOwnership, assertBoardMemberAccess } from '@/lib/auth-helpers'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reports = await prisma.adminReport.findMany({
    where: {
      board: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    include: {
      board: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const mapped = reports.map((r) => ({
    id: r.id,
    boardId: r.boardId,
    boardName: r.board.name,
    stateId: r.stateId,
    stateName: null, // Could be joined if state relation added
    type: r.type,
    message: r.message,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({ reports: mapped })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, status } = body

  const denied = await assertReportOwnership(id, session.user.id)
  if (denied) return denied

  const report = await prisma.adminReport.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? new Date() : null,
    },
  })

  return NextResponse.json({ report })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { boardId, stateId, type, message, details } = body

  const denied = await assertBoardMemberAccess(boardId, session.user.id)
  if (denied) return denied

  const report = await prisma.adminReport.create({
    data: {
      boardId,
      stateId: stateId || null,
      type,
      message,
      details: details || null,
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}
