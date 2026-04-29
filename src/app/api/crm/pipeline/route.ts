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
 * Move a conversation to a new state with history tracking
 * Body: { conversationId, targetStateId }
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

    // Verify user has access to this conversation via board membership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        board: {
          members: { some: { userId: session.user.id } },
        },
      },
      include: { currentState: true },
    })

    if (!conversation) {
      return jsonError("Lead not found or access denied.", "LEAD_NOT_FOUND", 404)
    }

    // Verify target state belongs to the same board
    const targetState = await prisma.state.findFirst({
      where: {
        id: targetStateId,
        boardId: conversation.boardId || undefined,
      },
    })

    if (!targetState) {
      return jsonError("Target stage not found.", "STATE_NOT_FOUND", 404)
    }

    // Build state history entry
    const historyEntry = {
      fromStateId: conversation.currentStateId,
      fromStateName: conversation.currentState?.name || null,
      toStateId: targetStateId,
      timestamp: new Date().toISOString(),
      source: "manual_drag",
    }

    const existingHistory = Array.isArray(conversation.stateHistory) ? conversation.stateHistory : []

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        currentStateId: targetStateId,
        stateHistory: [...existingHistory, historyEntry],
        lastMessageAt: new Date(),
      },
      include: {
        currentState: true,
        messages: {
          orderBy: { timestamp: "desc" },
          take: 3,
          select: {
            id: true,
            content: true,
            direction: true,
            timestamp: true,
            messageType: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, conversation: updatedConversation })
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
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
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
                    messageType: true,
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

    const unassignedLeads = await prisma.conversation.findMany({
      where: {
        boardId,
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
            messageType: true,
          },
        },
      },
    })

    const mapConv = (conv: any) => ({
      id: conv.id,
      customerName: conv.customerName,
      customerPhone: conv.customerPhone,
      customerAvatar: conv.customerAvatar,
      leadScore: conv.leadScore,
      status: conv.status,
      source: conv.source,
      tags: conv.tags,
      customFields: conv.customFields,
      stateHistory: conv.stateHistory,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages,
      currentStateId: conv.currentStateId,
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
        leads: state.conversations.map(mapConv),
      })),
      unassignedLeads: unassignedLeads.map(mapConv),
    })
  } catch (error) {
    console.error("CRM Pipeline API error:", error)
    return jsonError("Pipeline could not be loaded. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
