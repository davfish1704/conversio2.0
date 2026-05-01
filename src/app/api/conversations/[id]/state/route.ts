import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * PATCH /api/conversations/[id]/state
 * Update lead state with history tracking (pipeline drag)
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

    // Get conversation with lead — prüft gleichzeitig Board-Mitgliedschaft
    const conversation = await (prisma as any).conversation.findFirst({
      where: {
        id: params.id,
        board: { members: { some: { userId: session.user.id } } },
      },
      include: {
        lead: {
          include: { currentState: true },
        },
      },
    })

    if (!conversation || !conversation.lead) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    const lead = conversation.lead

    // Build state history entry
    const historyEntry = {
      fromStateId: lead.currentStateId,
      fromStateName: lead.currentState?.name || null,
      toStateId: stateId,
      timestamp: new Date().toISOString(),
      source,
    }

    const existingHistory = Array.isArray(lead.stateHistory) ? lead.stateHistory : []

    // Update lead.currentStateId + lead.stateHistory (Pipeline-State)
    const updatedLead = await (prisma as any).lead.update({
      where: { id: lead.id },
      data: {
        currentStateId: stateId,
        stateHistory: [...existingHistory, historyEntry],
      },
    })

    // Optional: auch conversation.currentStateId syncen für AI-Engine
    await (prisma as any).conversation.update({
      where: { id: params.id },
      data: { currentStateId: stateId },
    })

    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error("State update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
