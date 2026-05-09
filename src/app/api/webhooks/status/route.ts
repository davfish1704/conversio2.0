import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const channels = await prisma.boardChannel.findMany({
    select: { boardId: true, platform: true, status: true, connectedAt: true },
  })

  const stats = await Promise.all(
    channels.map(async (ch) => {
      const [lastEntry, processedToday] = await Promise.all([
        prisma.processedWebhook.findFirst({
          where: { boardId: ch.boardId, channel: ch.platform },
          orderBy: { processedAt: "desc" },
          select: { processedAt: true },
        }),
        prisma.processedWebhook.count({
          where: { boardId: ch.boardId, channel: ch.platform, processedAt: { gte: todayStart } },
        }),
      ])
      return {
        boardId: ch.boardId,
        channel: ch.platform,
        status: ch.status,
        connectedAt: ch.connectedAt,
        lastReceived: lastEntry?.processedAt ?? null,
        processedToday,
      }
    })
  )

  return NextResponse.json({ webhooks: stats })
}
