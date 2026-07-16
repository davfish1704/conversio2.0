import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { createInvite } from "@/lib/channel-invites"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function GET(
  _req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await (prisma as any).lead.findUnique({
    where: { id: params.leadId },
    select: { boardId: true },
  })
  if (!lead?.boardId) return NextResponse.json({ error: "Lead nicht gefunden" }, { status: 404 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: lead.boardId }) } catch (e) { return toNextResponse(e) }

  const waChannel = await prisma.boardChannel.findFirst({
    where: { boardId: lead.boardId, platform: "whatsapp", status: "connected" },
    select: { id: true },
  })
  if (!waChannel) {
    return NextResponse.json(
      { error: "Kein verbundener WhatsApp-Kanal für dieses Board." },
      { status: 400 }
    )
  }

  try {
    const invite = await createInvite(params.leadId, waChannel.id, session.user.id)
    return NextResponse.json({
      token: invite.token,
      deepLink: invite.deepLink,
      startText: `Start ${invite.token}`,
      qrUrl: invite.qrUrl,
      expiresAt: invite.expiresAt,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Fehler"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
