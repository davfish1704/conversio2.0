import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * GET /api/conversations/stats
 * Returns real-time stats for the dashboard (scoped to user's boards)
 */

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all board IDs the user has access to
    const memberships = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true },
    })
    const boardIds = memberships.map((m) => m.boardId)

    if (boardIds.length === 0) {
      return NextResponse.json({
        activeConversations: 0,
        needsReply: 0,
        messagesToday: 0,
        conversationsThisWeek: 0,
        recentActivity: [],
      })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      activeConversations,
      needsReplyCount,
      totalMessagesToday,
      totalConversationsWeek,
      recentInbound,
    ] = await Promise.all([
      // Active conversations (only user's boards)
      prisma.conversation.count({
        where: {
          status: "ACTIVE",
          boardId: { in: boardIds },
        },
      }),

      // Needs reply (last message is inbound and unread, scoped to user's boards)
      prisma.conversation.count({
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
      }),

      // Messages today (scoped to user's boards)
      prisma.message.count({
        where: {
          timestamp: { gte: todayStart },
          conversation: {
            boardId: { in: boardIds },
          },
        },
      }),

      // Conversations this week (scoped to user's boards)
      prisma.conversation.count({
        where: {
          lastMessageAt: { gte: weekStart },
          boardId: { in: boardIds },
        },
      }),

      // Recent inbound messages (for activity feed, scoped to user's boards)
      prisma.message.findMany({
        where: {
          direction: "INBOUND",
          timestamp: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          conversation: {
            boardId: { in: boardIds },
          },
        },
        orderBy: { timestamp: "desc" },
        take: 5,
        include: {
          conversation: {
            select: {
              id: true,
            },
          },
        },
      }),
    ])

    return NextResponse.json({
      activeConversations,
      needsReply: needsReplyCount,
      messagesToday: totalMessagesToday,
      conversationsThisWeek: totalConversationsWeek,
      recentActivity: recentInbound,
    })
  } catch (error) {
    console.error("Stats API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
