import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const stuckThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // STUCK: Conversations ohne Update seit 24h
    const stuckConversations = await prisma.conversation.findMany({
      where: {
        updatedAt: { lt: stuckThreshold },
      },
      include: {
        board: { select: { id: true, name: true } },
        currentState: { select: { id: true, name: true } },
        messages: { orderBy: { id: "desc" }, take: 1 },
      },
      take: 50,
    })

    // LOOP: Conversations mit >10 Nachrichten
    const loopConversations = await prisma.conversation.findMany({
      where: {
        messages: { some: {} },
      },
      include: {
        board: { select: { id: true, name: true } },
        currentState: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      take: 50,
    })

    const loopFiltered = loopConversations.filter(
      (c: any) => c._count.messages > 10
    )

    const createdReports = []

    for (const conv of stuckConversations) {
      const report = await prisma.adminReport.create({
        data: {
          boardId: conv.board?.id || "unknown",
          stateId: conv.currentState?.id,
          type: "STUCK",
          message: "Conversation stuck for 24+ hours. Last message: \"" + (conv.messages[0]?.content?.slice(0, 100) || "No message") + "...\"",
          status: "OPEN",
        },
      })
      createdReports.push({ ...report, boardName: conv.board?.name || "Unknown", stateName: conv.currentState?.name })
    }

    for (const conv of loopFiltered) {
      const existing = await prisma.adminReport.findFirst({
        where: {
          boardId: conv.board?.id || "unknown",
          type: "LOOP",
          status: "OPEN",
        },
      })

      if (!existing) {
        const report = await prisma.adminReport.create({
          data: {
            boardId: conv.board?.id || "unknown",
            stateId: conv.currentState?.id,
            type: "LOOP",
            message: "Potential loop detected: " + (conv as any)._count.messages + " messages in state \"" + (conv.currentState?.name || "Unknown") + "\". User might be stuck.",
            status: "OPEN",
          },
        })
        createdReports.push({ ...report, boardName: conv.board?.name || "Unknown", stateName: conv.currentState?.name })
      }
    }

    return NextResponse.json({
      scanned: stuckConversations.length + loopFiltered.length,
      created: createdReports.length,
      reports: createdReports,
    })
  } catch (error) {
    console.error("Admin scan error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
