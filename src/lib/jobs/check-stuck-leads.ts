import { prisma } from "@/lib/db"
import { notifyAdmin } from "@/lib/notifications/admin-notify"

const STUCK_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 Stunden
const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000    // Nicht erneut benachrichtigen innerhalb von 6 Stunden

export async function checkStuckLeads(): Promise<{ checked: number; notified: number }> {
  // Processed Webhooks älter als 7 Tage bereinigen
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await prisma.processedWebhook.deleteMany({ where: { processedAt: { lt: sevenDaysAgo } } })

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
    // Deduplizierung: überspringen wenn wir kürzlich über diesen Lead benachrichtigt haben
    const recent = await prisma.adminNotification.findFirst({
      where: {
        level: "WARNING",
        leadId: conv.leadId,
        createdAt: { gt: dedupeCutoff },
      },
    })
    if (recent) continue

    await notifyAdmin({
      level: "WARNING",
      title: "Lead ohne Aktivität (>24h)",
      message: `Conversation ${conv.id} hat seit ${conv.lastMessageAt?.toISOString() ?? "unbekannt"} keine Aktivität mehr. Letzte Aktivität: ${conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString("de-DE") : "—"}`,
      boardId: conv.boardId ?? undefined,
      leadId: conv.leadId ?? undefined,
      metadata: { conversationId: conv.id, lastMessageAt: conv.lastMessageAt },
    })
    notified++
  }

  return { checked: stuckConversations.length, notified }
}
