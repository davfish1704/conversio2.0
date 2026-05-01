import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * GET /api/conversations
 * Returns active conversations for the dashboard (scoped to user's boards)
 * Query params: ?status=ACTIVE&limit=50&needsReply=true
 */

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || "ACTIVE"
  const limit = parseInt(searchParams.get("limit") || "50")
  const needsReply = searchParams.get("needsReply") === "true"

  try {
    // Nur Conversations aus Boards des Nutzers zurückgeben (B2 fix)
    const memberships = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true },
    })
    const boardIds = memberships.map((m) => m.boardId)

    const conversations = await prisma.conversation.findMany({
      where: {
        status: status as any,
        boardId: { in: boardIds },
        ...(needsReply
          ? {
              messages: {
                some: {
                  direction: "INBOUND",
                  status: { not: "READ" },
                },
              },
            }
          : {}),
      },
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        currentState: true,
        board: { select: { id: true, name: true } },
      } as any,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    })

    // Count needs reply (scoped to user's boards)
    const needsReplyCount = await prisma.conversation.count({
      where: {
        status: "ACTIVE",
        boardId: { in: boardIds },
        messages: {
          some: {
            direction: "INBOUND",
            status: { not: "READ" },
          },
        },
      },
    })

    return NextResponse.json({
      conversations,
      counts: {
        total: conversations.length,
        needsReply: needsReplyCount,
      },
    })
  } catch (error) {
    console.error("❌ Conversations API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
