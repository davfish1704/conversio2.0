import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: { team: { include: { whatsappAccounts: true } } }
  })

  const account = teamMember?.team?.whatsappAccounts?.[0] || null
  return NextResponse.json(account)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const newPhone = body.phoneNumber?.trim()
  const newToken = body.accessToken?.trim()

  if (!newPhone) {
    return NextResponse.json({ error: "Telefonnummer ist erforderlich" }, { status: 400 })
  }

  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: { team: { include: { whatsappAccounts: true } } }
  })

  const account = teamMember?.team?.whatsappAccounts?.[0]
  if (!account) {
    return NextResponse.json({ error: "Kein WhatsApp-Konto gefunden" }, { status: 404 })
  }

  const updated = await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: {
      phoneNumber: newPhone,
      ...(newToken ? { accessTokenEncrypted: newToken } : {}),
      status: "PENDING",
    }
  })

  return NextResponse.json(updated)
}
