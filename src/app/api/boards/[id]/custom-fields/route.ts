import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const board = await prisma.board.findUnique({
    where: { id: params.id },
    select: { boardCustomFields: true },
  })
  return NextResponse.json({ fields: (board?.boardCustomFields as unknown[]) || [] })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied
  const { fields } = await req.json()
  const board = await prisma.board.update({
    where: { id: params.id },
    data: { boardCustomFields: fields },
  })
  return NextResponse.json({ fields: (board.boardCustomFields as unknown[]) || [] })
}
