import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"
import { createBoardInvite } from "@/lib/channel-invites"
import { buildDeepLink } from "@/lib/channel-invites"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const { targetChannelId, campaign, expiresInDays } = body as {
    targetChannelId?: string
    campaign?: string
    expiresInDays?: number
  }

  if (!targetChannelId) {
    return NextResponse.json({ error: "targetChannelId fehlt" }, { status: 400 })
  }

  // Rate-limit: max 20 Akquise-Invites pro Board pro 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCount = await (prisma as any).channelInvite.count({
    where: {
      boardId: params.id,
      source: "BOARD_ACQUISITION",
      createdAt: { gte: since },
    },
  })
  if (recentCount >= 20) {
    return NextResponse.json(
      { error: "Maximale Anzahl Akquise-Einladungen (20) für dieses Board in 24h erreicht" },
      { status: 429 }
    )
  }

  let invite
  try {
    invite = await createBoardInvite(params.id, targetChannelId, {
      campaign,
      expiresInDays,
      createdBy: session.user.id,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Einladung konnte nicht erstellt werden" },
      { status: 400 }
    )
  }

  return NextResponse.json({
    token: invite.token,
    deepLink: invite.deepLink,
    qrUrl: invite.qrUrl,
    expiresAt: invite.expiresAt,
    campaign: campaign ?? null,
  })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const rows = await (prisma as any).channelInvite.findMany({
    where: {
      boardId: params.id,
      source: "BOARD_ACQUISITION",
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      channel: {
        select: { platform: true, telegramBotUsername: true, waPhoneNumberId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const invites = rows.map((row: any) => ({
    id: row.id,
    token: row.token,
    deepLink: buildDeepLink(row.channel.platform, row.channel, row.token),
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      buildDeepLink(row.channel.platform, row.channel, row.token)
    )}`,
    campaign: row.campaign,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    platform: row.channel.platform,
  }))

  return NextResponse.json({ invites })
}
