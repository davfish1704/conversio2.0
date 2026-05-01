import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"

export async function GET(_req: NextRequest, { params }: { params: { leadId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await (prisma as any).lead.findUnique({
    where: { id: params.leadId },
    select: { boardId: true },
  })
  if (!lead) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 })

  const denied = await assertBoardMemberAccess(lead.boardId, session.user.id)
  if (denied) return denied

  const now = new Date()
  const invites = await (prisma as any).channelInvite.findMany({
    where: {
      leadId: params.leadId,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      targetChannelId: true,
      reason: true,
      expiresAt: true,
      createdAt: true,
      createdBy: true,
    },
  })

  return NextResponse.json({ invites })
}
