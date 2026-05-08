import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { notifyAdmin } from "@/lib/notifications/admin-notify"

const STUCK_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000    // don't re-notify within 6 hours

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS)
  const dedupeCutoff = new Date(Date.now() - DEDUPE_WINDOW_MS)

  const stuckConversations = await prisma.conversation.findMany({
    where: {
      status: "ACTIVE",
      aiEnabled: true,
      frozen: false,
      lastMessageAt: { lt: cutoff },
    },
    select: { id: true, boardId: true, leadId: true, lastMessageAt: true },
    take: 50,
  })

  let notified = 0

  for (const conv of stuckConversations) {
    // Dedupe: skip if we already notified about this conversation recently
    const recent = await prisma.adminNotification.findFirst({
      where: {
        type: "LEAD_STUCK",
        leadId: conv.id,
        createdAt: { gt: dedupeCutoff },
      },
    })
    if (recent) continue

    await notifyAdmin({
      type: "LEAD_STUCK",
      title: "Lead ohne Aktivität (>24h)",
      body: `Conversation ${conv.id} hat seit ${conv.lastMessageAt?.toISOString() ?? "unbekannt"} keine Aktivität mehr. Letzte Aktivität: ${conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString("de-DE") : "—"}`,
      boardId: conv.boardId ?? undefined,
      leadId: conv.id,
    })
    notified++
  }

  return NextResponse.json({ ok: true, checked: stuckConversations.length, notified })
}
