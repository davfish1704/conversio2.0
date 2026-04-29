import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertConversationOwnership } from "@/lib/auth-helpers"

/**
 * PATCH /api/conversations/[id]/state
 * Update conversation state with history tracking
 * Body: { stateId, source?: 'manual' | 'auto' | 'api' }
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { stateId, source = "manual" } = body

    if (stateId === undefined) {
      return NextResponse.json({ error: "stateId is required" }, { status: 400 })
    }

    // Get current conversation — prüft gleichzeitig Board-Mitgliedschaft
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        board: { members: { some: { userId: session.user.id } } },
      },
      include: { currentState: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    // Build state history entry
    const historyEntry = {
      fromStateId: conversation.currentStateId,
      fromStateName: conversation.currentState?.name || null,
      toStateId: stateId,
      timestamp: new Date().toISOString(),
      source,
    }

    const existingHistory = Array.isArray(conversation.stateHistory) ? conversation.stateHistory : []

    const updatedConversation = await prisma.conversation.update({
      where: { id: params.id },
      data: {
        currentStateId: stateId,
        stateHistory: [...existingHistory, historyEntry],
      },
      include: {
        currentState: true,
        messages: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    })

    return NextResponse.json({ conversation: updatedConversation })
  } catch (error) {
    console.error("❌ State update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
