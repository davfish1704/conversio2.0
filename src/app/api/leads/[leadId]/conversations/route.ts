import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function GET(_req: NextRequest, { params }: { params: { leadId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await (prisma as any).lead.findUnique({
    where: { id: params.leadId },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        include: {
          messages: { orderBy: { timestamp: "desc" }, take: 1 },
        },
      },
    },
  })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: lead.boardId }) } catch (e) { return toNextResponse(e) }
  return NextResponse.json({ conversations: lead.conversations })
}
