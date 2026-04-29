import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const formPhone = body.phoneNumber?.trim()
    const formToken = body.accessToken?.trim()

    // Form values take priority over env vars
    const accessToken = formToken || process.env.META_ACCESS_TOKEN
    const phoneNumberId = formPhone || process.env.META_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: "Telefonnummer und Access Token sind erforderlich" },
        { status: 400 }
      )
    }

    // Verify credentials against Meta Graph API
    const phoneCheck = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}?access_token=${accessToken}`
    )
    const phoneData = await phoneCheck.json()

    if (!phoneCheck.ok) {
      return NextResponse.json({ error: "Ungültige Zugangsdaten", details: phoneData }, { status: 400 })
    }

    // Save to DB
    const team = await prisma.team.findFirst({
      where: { members: { some: { userId: session.user.id } } }
    })

    if (!team) {
      return NextResponse.json({ error: "Kein Team gefunden" }, { status: 400 })
    }

    await prisma.whatsAppAccount.upsert({
      where: { phoneNumber: phoneNumberId },
      update: { status: "ACTIVE", teamId: team.id, accessTokenEncrypted: accessToken },
      create: { phoneNumber: phoneNumberId, teamId: team.id, status: "ACTIVE", accessTokenEncrypted: accessToken }
    })

    return NextResponse.json({
      success: true,
      message: "WhatsApp verbunden",
      phoneNumber: phoneData.display_phone_number || phoneNumberId
    })

  } catch (error) {
    console.error("WhatsApp connect error:", error)
    return NextResponse.json({ error: "Failed to connect" }, { status: 500 })
  }
}
