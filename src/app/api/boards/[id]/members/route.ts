import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await assertBoardAccess({ userId: session.user.id, boardId: params.id })
    } catch (e) {
      return toNextResponse(e)
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Board members fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      await assertBoardAccess({ userId: session.user.id, boardId: params.id })
    } catch (e) {
      return toNextResponse(e)
    }

    const body = await req.json()
    const { userId: targetUserId, role } = body

    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    const validRoles = ["ADMIN", "AGENT", "VIEWER"]
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const existing = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: params.id, userId: targetUserId } },
    })
    if (existing) {
      return NextResponse.json({ error: "User is already a member of this board" }, { status: 409 })
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId: params.id,
        userId: targetUserId,
        role: role ?? "AGENT",
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error("Board member add error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
