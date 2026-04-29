import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: { team: { include: { whatsappAccounts: true } } }
  })

  const accountId = teamMember?.team?.whatsappAccounts?.[0]?.id

  if (accountId) {
    await prisma.whatsAppAccount.delete({ where: { id: accountId } })
  }

  return NextResponse.json({ success: true })
}
