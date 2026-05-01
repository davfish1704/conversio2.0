import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    select: { teamId: true },
  })

  let hasWhatsApp = false
  if (member) {
    const boards = await prisma.board.findMany({
      where: { teamId: member.teamId },
      select: { id: true },
    })
    const boardIds = boards.map(b => b.id)
    if (boardIds.length) {
      const waChannel = await prisma.boardChannel.findFirst({
        where: { boardId: { in: boardIds }, platform: "whatsapp", status: "connected" },
      })
      hasWhatsApp = !!waChannel
    }
  }

  return NextResponse.json([
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "Connect your WhatsApp Business API",
      icon: "💬",
      connected: hasWhatsApp,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "gcalendar",
      name: "Google Calendar",
      description: "Sync appointments and meetings",
      icon: "📅",
      connected: false,
      color: "bg-blue-100 text-blue-700",
    },
  ])
}
