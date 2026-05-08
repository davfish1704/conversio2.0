import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

const MARKUP = 2.0

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const days = Number(req.nextUrl.searchParams.get("days") ?? "30")
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [totalAgg, byModelRaw, byBoardRaw] = await Promise.all([
    prisma.usageLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, inputTokens: true, outputTokens: true, providerCost: true },
    }),
    prisma.usageLog.groupBy({
      by: ["model", "provider"],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, providerCost: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
    prisma.usageLog.groupBy({
      by: ["boardId"],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, providerCost: true },
      orderBy: { _sum: { totalTokens: "desc" } },
    }),
  ])

  // Enrich board rows with board name + owner email
  const boardIds = byBoardRaw.map((r) => r.boardId)
  const boards = await prisma.board.findMany({
    where: { id: { in: boardIds } },
    select: {
      id: true,
      name: true,
      members: {
        where: { role: "ADMIN" },
        take: 1,
        select: { user: { select: { email: true } } },
      },
    },
  })
  const boardMap = new Map(boards.map((b) => [b.id, b]))

  const byBoard = byBoardRaw.map((row) => {
    const b = boardMap.get(row.boardId)
    const providerCost = row._sum.providerCost ?? 0
    const charged = providerCost * MARKUP
    return {
      boardId: row.boardId,
      boardName: b?.name ?? "Unbekannt",
      ownerEmail: b?.members[0]?.user.email ?? "—",
      totalTokens: row._sum.totalTokens ?? 0,
      providerCost,
      charged,
      margin: charged - providerCost,
      marginPct: providerCost > 0 ? Math.round(((charged - providerCost) / charged) * 100) : 0,
    }
  })

  const totalCost = totalAgg._sum.providerCost ?? 0
  const totalCharged = totalCost * MARKUP

  return NextResponse.json({
    summary: {
      totalTokens: totalAgg._sum.totalTokens ?? 0,
      inputTokens: totalAgg._sum.inputTokens ?? 0,
      outputTokens: totalAgg._sum.outputTokens ?? 0,
      providerCost: totalCost,
      charged: totalCharged,
      margin: totalCharged - totalCost,
      marginPct: totalCost > 0 ? Math.round(((totalCharged - totalCost) / totalCharged) * 100) : 0,
    },
    byBoard,
    byModel: byModelRaw.map((row) => ({
      model: row.model,
      provider: row.provider,
      totalTokens: row._sum.totalTokens ?? 0,
      providerCost: row._sum.providerCost ?? 0,
    })),
  })
}
