import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { generateTelegramInviteLink } from "@/lib/messaging/telegram-invite"

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await (prisma as any).lead.findUnique({
    where: { id: params.leadId },
    select: { boardId: true },
  })
  if (!lead?.boardId) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

  const membership = await prisma.boardMember.findFirst({
    where: { boardId: lead.boardId, userId: session.user.id },
  })
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const link = await generateTelegramInviteLink(params.leadId)
    return NextResponse.json({ link })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Fehler"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
