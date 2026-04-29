import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * GET /api/boards/[id]/pipeline
 * Returns board with states and their assigned conversations (leads)
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Verify user has access to this board
    const board = await prisma.board.findFirst({
      where: {
        id: params.id,
        members: { some: { userId: session.user.id } },
      },
      include: {
        states: {
          orderBy: { orderIndex: "asc" },
          include: {
            conversations: {
              where: { status: "ACTIVE" },
              orderBy: { lastMessageAt: "desc" },
              take: 100,
              include: {
                messages: {
                  orderBy: { timestamp: "desc" },
                  take: 1,
                  select: {
                    id: true,
                    content: true,
                    direction: true,
                    timestamp: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Also get unassigned conversations (leads without current state)
    const unassignedLeads = await prisma.conversation.findMany({
      where: {
        boardId: params.id,
        currentStateId: null,
        status: "ACTIVE",
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            direction: true,
            timestamp: true,
          },
        },
      },
    })

    return NextResponse.json({
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        isActive: board.isActive,
      },
      states: board.states.map((state) => ({
        id: state.id,
        name: state.name,
        orderIndex: state.orderIndex,
        type: state.type,
        leads: state.conversations.map((conv) => ({
          id: conv.id,
          customerName: conv.customerName,
          customerPhone: conv.customerPhone,
          leadScore: conv.leadScore,
          status: conv.status,
          source: conv.source,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          lastMessage: conv.messages[0] || null,
        })),
      })),
      unassignedLeads: unassignedLeads.map((conv) => ({
        id: conv.id,
        customerName: conv.customerName,
        customerPhone: conv.customerPhone,
        leadScore: conv.leadScore,
        status: conv.status,
        source: conv.source,
        createdAt: conv.createdAt,
        lastMessageAt: conv.lastMessageAt,
        lastMessage: conv.messages[0] || null,
      })),
    })
  } catch (error) {
    console.error("❌ Pipeline API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
