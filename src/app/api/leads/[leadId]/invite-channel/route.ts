import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"
import { createInvite } from "@/lib/channel-invites"
import { sendMessage } from "@/lib/messaging/dispatcher"

export async function POST(req: NextRequest, { params }: { params: { leadId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await (prisma as any).lead.findUnique({
    where: { id: params.leadId },
    select: {
      id: true,
      boardId: true,
      conversations: {
        where: { status: "ACTIVE" },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { id: true, channel: true },
      },
    },
  })
  if (!lead) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 })

  const denied = await assertBoardMemberAccess(lead.boardId, session.user.id)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const { targetChannelId, sendNow = false, reason } = body as {
    targetChannelId?: string
    sendNow?: boolean
    reason?: string
  }

  if (!targetChannelId) {
    return NextResponse.json({ error: "targetChannelId fehlt" }, { status: 400 })
  }

  // Rate-limit: max 3 Invites pro Lead pro 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCount = await (prisma as any).channelInvite.count({
    where: { leadId: params.leadId, createdAt: { gte: since } },
  })
  if (recentCount >= 3) {
    return NextResponse.json(
      { error: "Maximale Anzahl Einladungen (3) für diesen Lead in 24h erreicht" },
      { status: 429 }
    )
  }

  let invite
  try {
    invite = await createInvite(params.leadId, targetChannelId, session.user.id, reason)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Einladung konnte nicht erstellt werden" },
      { status: 400 }
    )
  }

  if (sendNow) {
    const primaryConversation = lead.conversations?.[0]
    if (primaryConversation) {
      const brain = await (prisma as any).boardBrain.findUnique({
        where: { boardId: lead.boardId },
        select: { channelSwitchTemplate: true },
      })
      const targetChannel = await prisma.boardChannel.findUnique({
        where: { id: targetChannelId },
        select: { platform: true },
      })
      const channelName = targetChannel?.platform === "telegram" ? "Telegram" : "WhatsApp"
      const template: string =
        (brain as any)?.channelSwitchTemplate ??
        "Du kannst diese Unterhaltung auch auf {channel} weiterführen: {link}"
      const message = template.replace("{channel}", channelName).replace("{link}", invite.deepLink)
      await sendMessage(primaryConversation.id, message)
    }
  }

  return NextResponse.json({
    token: invite.token,
    deepLink: invite.deepLink,
    qrUrl: invite.qrUrl,
    expiresAt: invite.expiresAt,
  })
}
