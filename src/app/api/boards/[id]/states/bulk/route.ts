import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

/**
 * POST /api/boards/[id]/states/bulk
 * Body: { states: Array<{ name, type, mission, rules, orderIndex, config }>, mode: "append" | "replace" }
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
      await prisma.state.deleteMany({
        where: { boardId: params.id },
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
            mission: s.mission || null,
            rules: s.rules || null,
            orderIndex: startOrderIndex + (s.orderIndex ?? index),
            config: s.config || null,
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
