import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const boards = await prisma.board.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      _count: {
        select: { states: true, members: true, conversations: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ boards })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, teamId } = body

  // Find user's team if teamId not provided
  let targetTeamId = teamId
  if (!targetTeamId) {
    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      select: { teamId: true },
    })
    if (membership) {
      targetTeamId = membership.teamId
    } else {
      // Auto-create a personal team for the user
      const newTeam = await prisma.team.create({
        data: {
          name: `${session.user.name || 'Mein'} Team`,
          slug: `team-${session.user.id.slice(-6)}-${Date.now()}`,
          ownerId: session.user.id,
          members: {
            create: {
              userId: session.user.id,
              role: 'ADMIN',
            },
          },
        },
      })
      targetTeamId = newTeam.id
    }
  }

  const board = await prisma.board.create({
    data: {
      name,
      description: description || null,
      teamId: targetTeamId,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: 'ADMIN',
        },
      },
    },
    include: {
      _count: {
        select: { states: true, members: true },
      },
    },
  })

  return NextResponse.json({ board }, { status: 201 })
}
