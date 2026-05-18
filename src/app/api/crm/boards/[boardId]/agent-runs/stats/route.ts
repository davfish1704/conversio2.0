import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function parseSinceParam(raw: string | null): Date {
  const map: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 }
  const days = map[raw ?? "7d"] ?? 7
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

const OUTCOME_WEIGHTS: Record<string, "success" | "handoff" | "error"> = {
  SUCCESS_CONTINUE: "success",
  SUCCESS_HANDOFF:  "handoff",
  HANDOFF_BLOCKED:  "handoff",
  TOOL_EXECUTION_FAILED: "error",
  LLM_ERROR:        "error",
  ESCALATED:        "error",
}

export async function GET(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Unauthorized", 401)

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.boardId }) } catch (e) { return toNextResponse(e) }

  const since = parseSinceParam(req.nextUrl.searchParams.get("since"))

  try {
    const [
      totals,
      byState,
      recentFailures,
    ] = await Promise.all([
      prisma.agentRun.aggregate({
        where: { boardId: params.boardId, createdAt: { gte: since } },
        _count: true,
        _sum: { costCents: true, totalTokens: true, latencyMs: true },
        _avg: { latencyMs: true },
      }),

      prisma.agentRun.groupBy({
        by: ["stateId", "outcome"],
        where: { boardId: params.boardId, createdAt: { gte: since } },
        _count: true,
        _sum: { costCents: true, latencyMs: true, totalTokens: true },
      }),

      prisma.agentRun.findMany({
        where: { boardId: params.boardId, outcome: { in: ["LLM_ERROR", "TOOL_EXECUTION_FAILED", "HANDOFF_BLOCKED", "ESCALATED"] }, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          state: { select: { id: true, name: true } },
          conversation: { select: { id: true, channel: true } },
        },
      }),
    ])

    const total = totals._count
    const totalCost = (totals._sum.costCents ?? 0) / 100
    const totalTokens = totals._sum.totalTokens ?? 0
    const avgLatency = Math.round(totals._avg.latencyMs ?? 0)

    const stateIds = [...new Set(byState.map((r) => r.stateId))]
    const states = stateIds.length > 0
      ? await prisma.state.findMany({
          where: { id: { in: stateIds } },
          select: { id: true, name: true },
        })
      : []
    const stateMap = new Map(states.map((s) => [s.id, s.name]))

    const stateGroups = new Map<string, { stateId: string; stateName: string; total: number; success: number; handoff: number; error: number; totalCost: number; avgLatency: number; totalTokens: number }>()
    for (const row of byState) {
      const key = row.stateId
      const existing = stateGroups.get(key) ?? {
        stateId: key,
        stateName: stateMap.get(key) ?? "Unknown",
        total: 0, success: 0, handoff: 0, error: 0,
        totalCost: 0, avgLatency: 0, totalTokens: 0,
      }
      existing.total += row._count
      existing.totalCost += (row._sum.costCents ?? 0) / 100
      existing.avgLatency = Math.max(existing.avgLatency, row._sum.latencyMs ?? 0)
      existing.totalTokens += row._sum.totalTokens ?? 0

      const cat = OUTCOME_WEIGHTS[row.outcome] ?? "error"
      existing[cat] += row._count

      stateGroups.set(key, existing)
    }

    const byStateStats = [...stateGroups.values()]
      .sort((a, b) => b.total - a.total)
      .map((s) => ({
        ...s,
        failureRate: s.total > 0 ? Number(((s.error / s.total) * 100).toFixed(1)) : 0,
        handoffRate: s.total > 0 ? Number(((s.handoff / s.total) * 100).toFixed(1)) : 0,
      }))

    const handoffRuns = byState.filter((r) => r.outcome === "SUCCESS_HANDOFF" || r.outcome === "HANDOFF_BLOCKED")
    const totalHandoffAttempts = handoffRuns.reduce((sum, r) => sum + r._count, 0)
    const successfulHandoffs = handoffRuns.filter((r) => r.outcome === "SUCCESS_HANDOFF").reduce((sum, r) => sum + r._count, 0)
    const handoffSuccessRate = totalHandoffAttempts > 0
      ? Number(((successfulHandoffs / totalHandoffAttempts) * 100).toFixed(1))
      : null

    return NextResponse.json({
      total,
      totalCost: Number(totalCost.toFixed(4)),
      totalTokens,
      avgLatency,
      handoffSuccessRate,
      byState: byStateStats,
      recentFailures: recentFailures.map((r) => ({
        id: r.id,
        outcome: r.outcome,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt,
        stateName: r.state?.name ?? null,
        channel: r.conversation?.channel ?? null,
      })),
    })
  } catch (error) {
    console.error("[agent-runs] GET /boards/[boardId]/agent-runs/stats error:", error)
    return jsonError("Failed to load agent run stats", 500)
  }
}
