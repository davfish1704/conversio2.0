import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const daysParam = parseInt(searchParams.get("days") || "30", 10)
  const days = Math.min(Math.max(daysParam, 7), 90)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const memberships = await prisma.boardMember.findMany({
    where: { userId: session.user.id },
    select: { boardId: true },
  })

  const boardIds = memberships.map((m) => m.boardId)

  if (boardIds.length === 0) {
    return NextResponse.json({
      daily: [],
      channel: [],
      status: [],
      funnel: [],
      totalLeads: 0,
      activeLeads: 0,
      newThisWeek: 0,
      needsReply: 0,
    })
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      boardId: { in: boardIds },
      createdAt: { gte: cutoff },
    },
    select: {
      id: true,
      channel: true,
      status: true,
      createdAt: true,
      currentStateId: true,
    },
  })

  const dailyMap = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dailyMap.set(d.toISOString().split("T")[0], 0)
  }

  for (const c of conversations) {
    const day = c.createdAt.toISOString().split("T")[0]
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }

  const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }))

  const channelMap = new Map<string, number>()
  for (const c of conversations) {
    const source = c.channel || "unknown"
    channelMap.set(source, (channelMap.get(source) || 0) + 1)
  }

  const channel = Array.from(channelMap.entries()).map(([name, value]) => ({
    name: name === "whatsapp" ? "WhatsApp" : name === "facebook" ? "Facebook" : name === "manual" ? "Manual" : name,
    value,
  }))

  const allConversations = await prisma.conversation.findMany({
    where: { boardId: { in: boardIds } },
    select: { status: true },
  })

  const statusMap = new Map<string, number>()
  for (const c of allConversations) {
    statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1)
  }

  const status = Array.from(statusMap.entries()).map(([name, value]) => ({
    name,
    value,
  }))

  // Funnel: leads per pipeline state
  const states = await prisma.state.findMany({
    where: { boardId: { in: boardIds } },
    select: { id: true, name: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  })

  const stateCounts = await prisma.conversation.groupBy({
    by: ["currentStateId"],
    where: { boardId: { in: boardIds } },
    _count: { id: true },
  })

  const countMap = new Map<string, number>()
  for (const sc of stateCounts) {
    if (sc.currentStateId) {
      countMap.set(sc.currentStateId, sc._count.id)
    }
  }

  const funnel = states.map((s) => ({
    name: s.name,
    value: countMap.get(s.id) || 0,
  }))

  const totalLeads = allConversations.length
  const activeLeads = allConversations.filter((c) => c.status === "ACTIVE").length
  const newThisWeek = conversations.filter((c) => c.createdAt >= sevenDaysAgo).length

  const recentMessages = await prisma.message.findMany({
    where: {
      conversation: { boardId: { in: boardIds } },
      direction: "INBOUND",
      timestamp: { gte: oneDayAgo },
    },
    select: { conversationId: true },
    distinct: ["conversationId"],
  })

  const needsReply = recentMessages.length

  return NextResponse.json({
    daily,
    channel,
    status,
    funnel,
    totalLeads,
    activeLeads,
    newThisWeek,
    needsReply,
  })
}
