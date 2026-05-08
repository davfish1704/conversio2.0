import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Unauthorized", 401)

  const board = await prisma.board.findFirst({
    where: {
      id: params.id,
      members: { some: { userId: session.user.id } },
    },
    select: { id: true },
  })
  if (!board) return jsonError("Board not found", 404)

  const days = Number(req.nextUrl.searchParams.get("days") ?? "30")
  const since30d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [allTimeTotals, last30dTotals, byModel, rawLast30d] = await Promise.all([
    prisma.usageLog.aggregate({
      where: { boardId: params.id },
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true, providerCost: true },
    }),
    prisma.usageLog.aggregate({
      where: { boardId: params.id, createdAt: { gte: since30d } },
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true, providerCost: true },
    }),
    prisma.usageLog.groupBy({
      by: ["model", "provider"],
      where: { boardId: params.id, createdAt: { gte: since30d } },
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true, providerCost: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    prisma.usageLog.findMany({
      where: { boardId: params.id, conversationId: { not: null }, createdAt: { gte: since30d } },
      select: {
        conversationId: true,
        totalTokens: true,
        providerCost: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Group by conversation for top conversations
  const convMap = new Map<string, { totalTokens: number; cost: number; calls: number }>()
  for (const row of rawLast30d) {
    if (!row.conversationId) continue
    const existing = convMap.get(row.conversationId) ?? { totalTokens: 0, cost: 0, calls: 0 }
    convMap.set(row.conversationId, {
      totalTokens: existing.totalTokens + row.totalTokens,
      cost: existing.cost + row.providerCost,
      calls: existing.calls + 1,
    })
  }
  const topConversations = [...convMap.entries()]
    .sort((a, b) => b[1].totalTokens - a[1].totalTokens)
    .slice(0, 10)
    .map(([conversationId, stats]) => ({ conversationId, ...stats }))

  // Group by day for chart
  const dayMap = new Map<string, { totalTokens: number; cost: number }>()
  for (const row of rawLast30d) {
    const day = row.createdAt.toISOString().slice(0, 10)
    const existing = dayMap.get(day) ?? { totalTokens: 0, cost: 0 }
    dayMap.set(day, {
      totalTokens: existing.totalTokens + row.totalTokens,
      cost: existing.cost + row.providerCost,
    })
  }
  // Fill missing days with 0
  const byDay: { date: string; totalTokens: number; cost: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    byDay.push({ date: d, ...(dayMap.get(d) ?? { totalTokens: 0, cost: 0 }) })
  }

  return NextResponse.json({
    allTime: {
      totalTokens: allTimeTotals._sum.totalTokens ?? 0,
      inputTokens: allTimeTotals._sum.inputTokens ?? 0,
      outputTokens: allTimeTotals._sum.outputTokens ?? 0,
      cost: allTimeTotals._sum.providerCost ?? 0,
    },
    last30d: {
      totalTokens: last30dTotals._sum.totalTokens ?? 0,
      inputTokens: last30dTotals._sum.inputTokens ?? 0,
      outputTokens: last30dTotals._sum.outputTokens ?? 0,
      cost: last30dTotals._sum.providerCost ?? 0,
    },
    byModel: byModel.map((row) => ({
      model: row.model,
      provider: row.provider,
      totalTokens: row._sum.totalTokens ?? 0,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      cost: row._sum.providerCost ?? 0,
    })),
    topConversations,
    byDay,
  })
}
