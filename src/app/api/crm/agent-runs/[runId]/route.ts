import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Unauthorized", 401)

  try {
    const run = await prisma.agentRun.findUnique({
      where: { id: params.runId },
      include: {
        state: { select: { id: true, name: true, agentRole: true } },
        conversation: { select: { id: true, channel: true } },
        lead: { select: { id: true, name: true, phone: true } },
        executionLogs: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            action: true,
            input: true,
            output: true,
            status: true,
            errorMessage: true,
            createdAt: true,
          },
        },
      },
    })

    if (!run) return jsonError("Agent run not found", 404)

    try { await assertBoardAccess({ userId: session.user.id, boardId: run.boardId }) } catch (e) { return toNextResponse(e) }

    return NextResponse.json({ run })
  } catch (error) {
    console.error("[agent-runs] GET /agent-runs/[runId] error:", error)
    return jsonError("Failed to load agent run", 500)
  }
}
