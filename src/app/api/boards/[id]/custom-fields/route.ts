import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
  const board = await prisma.board.findUnique({
    where: { id: params.id },
    select: { boardCustomFields: true },
  })
  return NextResponse.json({ fields: (board?.boardCustomFields as unknown[]) || [] })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
  const { fields } = await req.json()
  const board = await prisma.board.update({
    where: { id: params.id },
    data: { boardCustomFields: fields },
  })
  return NextResponse.json({ fields: (board.boardCustomFields as unknown[]) || [] })
}
