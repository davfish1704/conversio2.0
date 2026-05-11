import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertConversationAccess, toNextResponse } from "@/lib/auth/assert-board-access"

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
    try { await assertConversationAccess({ userId: session.user.id, conversationId: params.id }) } catch (e) { return toNextResponse(e) }
    const conversation = await (prisma as any).conversation.findUnique({
      where: { id: params.id },
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

    // stage-guard ist der einzige autorisierte Weg für Lead-Stage-Änderungen
    const { moveLeadToStage } = await import("@/lib/leads/stage-guard")
    await moveLeadToStage(lead.id, stateId, "manual", session.user.id)

    // Conversation.currentStateId syncen für AI-Engine
    await (prisma as any).conversation.update({
      where: { id: params.id },
      data: { currentStateId: stateId },
    })

    const updatedLead = await (prisma as any).lead.findUnique({ where: { id: lead.id } })
    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error("State update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
