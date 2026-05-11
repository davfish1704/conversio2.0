import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const lead = await prisma.lead.findUnique({
    where: { id: params.leadId },
    select: { id: true, boardId: true },
  })

  if (!lead) {
    return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 })
  }

  try { await assertBoardAccess({ userId: session.user.id, boardId: lead.boardId }) } catch (e) { return toNextResponse(e) }

  // ExecutionLog → Conversation has no onDelete cascade; must clean up manually
  await prisma.$transaction(async (tx) => {
    const convIds = await tx.conversation
      .findMany({ where: { leadId: lead.id }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id))

    if (convIds.length > 0) {
      await tx.executionLog.deleteMany({ where: { conversationId: { in: convIds } } })
    }

    // Lead cascades: conversations, memories, channelInvites
    await tx.lead.delete({ where: { id: lead.id } })
  })

  return NextResponse.json({ success: true })
}
