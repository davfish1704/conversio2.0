import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Direkte Abfrage: Hat der User ein Team mit WhatsApp Accounts?
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: { 
      team: { include: { whatsappAccounts: true } }
    }
  })

  const whatsappAccount = teamMember?.team?.whatsappAccounts?.[0]
  const hasWhatsApp = whatsappAccount?.status === "ACTIVE"

  const integrations = [
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "Connect your WhatsApp Business API",
      icon: "💬",
      connected: hasWhatsApp,
      color: "bg-green-100 text-green-700"
    },
    {
      id: "gcalendar",
      name: "Google Calendar",
      description: "Sync appointments and meetings",
      icon: "📅",
      connected: false,
      color: "bg-blue-100 text-blue-700"
    }
  ]

  return NextResponse.json(integrations)
}
