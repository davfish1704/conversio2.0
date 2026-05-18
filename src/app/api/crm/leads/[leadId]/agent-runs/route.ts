import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Unauthorized", 401)

  const { leadId } = params

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, boardId: true },
    })
    if (!lead) return jsonError("Lead not found", 404)

    try { await assertBoardAccess({ userId: session.user.id, boardId: lead.boardId }) } catch (e) { return toNextResponse(e) }

    const searchParams = req.nextUrl.searchParams
    const cursor = searchParams.get("cursor")
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100)

    const runs = await prisma.agentRun.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        state: { select: { id: true, name: true, agentRole: true } },
        conversation: { select: { id: true, channel: true } },
      },
    })

    const hasMore = runs.length > limit
    const items = hasMore ? runs.slice(0, limit) : runs
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({ runs: items, nextCursor })
  } catch (error) {
    console.error("[agent-runs] GET /leads/[leadId]/agent-runs error:", error)
    return jsonError("Failed to load agent runs", 500)
  }
}
