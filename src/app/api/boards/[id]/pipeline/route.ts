import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * GET /api/boards/[id]/pipeline
 * Returns board with states and their assigned leads (CRM-Kontakte)
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
    const board = await (prisma as any).board.findFirst({
      where: {
        id: params.id,
        members: { some: { userId: session.user.id } },
      },
      include: {
        states: {
          orderBy: { orderIndex: "asc" },
          include: {
            leads: {
              orderBy: { updatedAt: "desc" },
              take: 100,
              include: {
                conversations: {
                  orderBy: { lastMessageAt: "desc" },
                  take: 1,
                  select: {
                    id: true,
                    lastMessageAt: true,
                    channel: true,
                    messages: {
                      orderBy: { timestamp: "desc" },
                      take: 1,
                      select: { id: true, content: true, direction: true, timestamp: true },
                    },
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

    // Also get unassigned leads (leads without current state)
    const unassignedLeads = await (prisma as any).lead.findMany({
      where: {
        boardId: params.id,
        currentStateId: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          select: {
            id: true,
            lastMessageAt: true,
            channel: true,
            messages: {
              orderBy: { timestamp: "desc" },
              take: 1,
              select: { id: true, content: true, direction: true, timestamp: true },
            },
          },
        },
      },
    })

    const mapLead = (lead: any) => {
      const latestConv = lead.conversations?.[0]
      return {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        avatar: lead.avatar,
        leadScore: lead.leadScore,
        source: lead.source,
        channel: lead.channel || latestConv?.channel,
        tags: lead.tags,
        customData: lead.customData,
        stateHistory: lead.stateHistory,
        currentStateId: lead.currentStateId,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        lastMessageAt: latestConv?.lastMessageAt,
        lastMessage: latestConv?.messages?.[0] || null,
        conversationId: latestConv?.id || null,
      }
    }

    return NextResponse.json({
      board: {
        id: board.id,
        name: board.name,
        description: board.description,
        isActive: board.isActive,
      },
      states: board.states.map((state: any) => ({
        id: state.id,
        name: state.name,
        orderIndex: state.orderIndex,
        type: state.type,
        leads: state.leads.map(mapLead),
      })),
      unassignedLeads: unassignedLeads.map(mapLead),
    })
  } catch (error) {
    console.error("Pipeline API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
