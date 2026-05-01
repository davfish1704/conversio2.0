import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/crypto/secrets"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"
import { randomBytes } from "crypto"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const channels = await prisma.boardChannel.findMany({ where: { boardId: params.id } })
  // Mask tokens in response
  const safe = channels.map(c => ({
    ...c,
    telegramBotToken: c.telegramBotToken ? "••••••" : null,
    waAccessToken: c.waAccessToken ? "••••••" : null,
    igAccessToken: c.igAccessToken ? "••••••" : null,
  }))
  return NextResponse.json({ channels: safe })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const body = await req.json()
  const { action, ...data } = body

  if (action === "connect-telegram") {
    const { token } = data
    // Validate token
    const testRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const testData = await testRes.json()
    if (!testData.ok) return NextResponse.json({ error: "Ungültiger Bot Token" }, { status: 400 })

    const botUsername = testData.result.username
    const secret = randomBytes(16).toString("hex")
    const appUrl = process.env.NEXTAUTH_URL || "https://conversio2-0-8wks.vercel.app"
    const webhookUrl = `${appUrl}/api/telegram/webhook/${params.id}`

    // Set webhook
    await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
    })

    const channel = await prisma.boardChannel.upsert({
      where: { boardId_platform: { boardId: params.id, platform: "telegram" } },
      create: {
        boardId: params.id,
        platform: "telegram",
        status: "connected",
        telegramBotToken: encrypt(token),
        telegramBotUsername: botUsername,
        telegramWebhookSecret: secret,
        connectedAt: new Date(),
      },
      update: {
        status: "connected",
        telegramBotToken: encrypt(token),
        telegramBotUsername: botUsername,
        telegramWebhookSecret: secret,
        connectedAt: new Date(),
        lastError: null,
      },
    })
    return NextResponse.json({ channel: { ...channel, telegramBotToken: "••••••" } })
  }

  if (action === "disconnect-telegram") {
    const channel = await prisma.boardChannel.findUnique({
      where: { boardId_platform: { boardId: params.id, platform: "telegram" } },
    })
    if (channel?.telegramBotToken) {
      const token = decrypt(channel.telegramBotToken)
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: "POST" })
    }
    await prisma.boardChannel.updateMany({
      where: { boardId: params.id, platform: "telegram" },
      data: { status: "disconnected", telegramBotToken: null, telegramBotUsername: null, telegramWebhookSecret: null, connectedAt: null },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "connect-whatsapp") {
    const { phoneNumberId, businessAccountId, accessToken, verifyToken } = data
    const channel = await prisma.boardChannel.upsert({
      where: { boardId_platform: { boardId: params.id, platform: "whatsapp" } },
      create: {
        boardId: params.id,
        platform: "whatsapp",
        status: "connected",
        waPhoneNumberId: phoneNumberId,
        waBusinessAccountId: businessAccountId,
        waAccessToken: encrypt(accessToken),
        waVerifyToken: verifyToken,
        connectedAt: new Date(),
      },
      update: {
        status: "connected",
        waPhoneNumberId: phoneNumberId,
        waBusinessAccountId: businessAccountId,
        waAccessToken: encrypt(accessToken),
        waVerifyToken: verifyToken,
        connectedAt: new Date(),
        lastError: null,
      },
    })
    return NextResponse.json({ channel: { ...channel, waAccessToken: "••••••" } })
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 })
}
