import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { z } from "zod"

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

const patchSchema = z.object({
  conversationId: z.string().min(1),
  targetStateId: z.string().min(1),
})

/**
 * PATCH /api/crm/pipeline
 * Move a lead to a new state with history tracking
 * Body: { conversationId, targetStateId }
 * conversationId hier ist die leadId (für Kompatibilität mit Frontend)
 */
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError("Invalid request. Please check your inputs.", "INVALID_INPUT", 400)
    }

    const { conversationId, targetStateId } = parsed.data

    // Lookup via Conversation um Board-Membership zu prüfen
    const conversation = await (prisma as any).conversation.findFirst({
      where: {
        id: conversationId,
        board: {
          members: { some: { userId: session.user.id } },
        },
      },
      include: {
        lead: {
          include: { currentState: true },
        },
      },
    })

    // Falls conversationId tatsächlich eine leadId ist (Frontend-Kompatibilität)
    let lead = conversation?.lead ?? null
    let boardId = conversation?.boardId ?? null

    if (!lead) {
      // Versuche direkt als Lead-ID zu finden
      const directLead = await (prisma as any).lead.findFirst({
        where: {
          id: conversationId,
          board: { members: { some: { userId: session.user.id } } },
        },
        include: { currentState: true },
      })
      if (directLead) {
        lead = directLead
        boardId = directLead.boardId
      }
    }

    if (!lead) {
      return jsonError("Lead not found or access denied.", "LEAD_NOT_FOUND", 404)
    }

    // Verify target state belongs to the same board
    const targetState = await prisma.state.findFirst({
      where: {
        id: targetStateId,
        boardId: boardId || undefined,
      },
    })

    if (!targetState) {
      return jsonError("Target stage not found.", "STATE_NOT_FOUND", 404)
    }

    // Build state history entry
    const historyEntry = {
      fromStateId: lead.currentStateId,
      fromStateName: lead.currentState?.name || null,
      toStateId: targetStateId,
      timestamp: new Date().toISOString(),
      source: "manual_drag",
    }

    const existingHistory = Array.isArray(lead.stateHistory) ? lead.stateHistory : []

    const updatedLead = await (prisma as any).lead.update({
      where: { id: lead.id },
      data: {
        currentStateId: targetStateId,
        stateHistory: [...existingHistory, historyEntry],
      },
      include: { currentState: true },
    })

    // Synce Conversation.currentStateId wenn vorhanden
    if (conversation) {
      await (prisma as any).conversation.update({
        where: { id: conversation.id },
        data: { currentStateId: targetStateId },
      })
    }

    return NextResponse.json({ success: true, lead: updatedLead })
  } catch (error) {
    console.error("CRM Pipeline PATCH error:", error)
    return jsonError("Status could not be updated. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  const { searchParams } = new URL(req.url)
  const boardId = searchParams.get("boardId")

  if (!boardId) {
    return jsonError("Board ID is required.", "INVALID_INPUT", 400)
  }

  try {
    const board = await (prisma as any).board.findFirst({
      where: {
        id: boardId,
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
                      select: {
                        id: true,
                        content: true,
                        direction: true,
                        timestamp: true,
                        messageType: true,
                      },
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
      return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)
    }

    const unassignedLeads = await (prisma as any).lead.findMany({
      where: {
        boardId,
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
              select: {
                id: true,
                content: true,
                direction: true,
                timestamp: true,
                messageType: true,
              },
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
        messages: latestConv?.messages || [],
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
    console.error("CRM Pipeline API error:", error)
    return jsonError("Pipeline could not be loaded. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
