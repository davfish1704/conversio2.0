import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

/**
 * POST /api/boards/[id]/states/bulk
 * Body: { states: Array<{ name, type, rules, orderIndex, config }>, mode: "append" | "replace" }
 * Creates multiple states in a single transaction.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { states, mode = "append" } = body

    if (!Array.isArray(states) || states.length === 0) {
      return NextResponse.json(
        { error: "states array is required" },
        { status: 400 }
      )
    }

    // Verify membership
    try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ["ADMIN", "AGENT"] },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If replace mode, delete existing states first
    if (mode === "replace") {
      await prisma.$transaction(async (tx) => {
        await tx.agentRun.deleteMany({
          where: {
            state: {
              boardId: params.id,
            },
          },
        })

        await tx.state.deleteMany({
          where: { boardId: params.id },
        })
      })
    }

    // Calculate starting orderIndex for append mode
    let startOrderIndex = 0
    if (mode === "append") {
      const lastState = await prisma.state.findFirst({
        where: { boardId: params.id },
        orderBy: { orderIndex: "desc" },
      })
      startOrderIndex = lastState ? lastState.orderIndex + 1 : 0
    }

    // Create all states in a transaction
    const createdStates = await prisma.$transaction(
      states.map((s: any, index: number) =>
        prisma.state.create({
          data: {
            name: s.name,
            boardId: params.id,
            type: s.type || "MESSAGE",
            rules: s.rules || null,
            orderIndex: startOrderIndex + (s.orderIndex ?? index),
            config: s.config || null,
            nextStateId: s.nextStateId || null,
            dataToCollect: Array.isArray(s.dataToCollect) ? s.dataToCollect : [],
            completionRule: s.completionRule || null,
            availableTools: Array.isArray(s.availableTools) ? s.availableTools : [],
            behaviorMode: s.behaviorMode || null,
            escalateOnLowConfidence: s.escalateOnLowConfidence ?? true,
            escalateOnOffMission: s.escalateOnOffMission ?? true,
            escalateOnNoReply: s.escalateOnNoReply ?? null,
            maxFollowups: s.maxFollowups ?? 3,
            followupAction: s.followupAction || "escalate",
            allowChannelSwitch: s.allowChannelSwitch ?? true,
            agentRole: s.agentRole || null,
            agentSystemPrompt: s.agentSystemPrompt || null,
            agentGoal: s.agentGoal || null,
            handoffMode: s.handoffMode || "HYBRID",
            handoffRules: Array.isArray(s.handoffRules) ? s.handoffRules : [],
            minAgentConfidence: typeof s.minAgentConfidence === "number" ? s.minAgentConfidence : 0.7,
            nextStateOnFail: s.nextStateOnFail || null,
          },
        })
      )
    )

    // Link transitions: each state points to the next one
    for (let i = 0; i < createdStates.length - 1; i++) {
      await prisma.state.update({
        where: { id: createdStates[i].id },
        data: { nextStateId: createdStates[i + 1].id },
      })
    }

    return NextResponse.json({
      states: createdStates,
      count: createdStates.length,
      mode,
    })
  } catch (error) {
    console.error("Bulk states creation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
