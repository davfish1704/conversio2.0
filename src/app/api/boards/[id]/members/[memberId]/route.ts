import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
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

    const membership = await prisma.boardMember.findUnique({
      where: { id: params.memberId },
    })
    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 })
    }
    if (membership.boardId !== params.id) {
      return NextResponse.json({ error: "Membership does not belong to this board" }, { status: 400 })
    }

    if (membership.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself. Contact another admin." }, { status: 400 })
    }

    await prisma.boardMember.delete({
      where: { id: params.memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Board member remove error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
