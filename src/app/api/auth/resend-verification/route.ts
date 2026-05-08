import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { randomUUID } from "crypto"
import { authLimiter, tooManyRequests } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || session.user.id
  const limited = await authLimiter(`resend:${ip}`)
  if (!limited.success) return tooManyRequests()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, emailVerified: true },
  })

  if (!user || !user.email) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  if (user.emailVerified) return NextResponse.json({ error: "Bereits verifiziert" }, { status: 400 })

  const verifyToken = randomUUID()
  const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken, verifyTokenExpiry },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://conversio2-0-8wks.vercel.app"
  const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`

  if (process.env.RESEND_API_KEY) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Conversio <noreply@conversio.de>",
        to: user.email,
        subject: "Bitte bestätige deine E-Mail-Adresse",
        html: `<p>Hallo ${user.name ?? ""},</p><p>Hier ist dein neuer Bestätigungslink:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Gültig für 24 Stunden.</p>`,
      }),
    }).catch(() => {})
  } else {
    console.log(`[resend-verify] ${user.email} → ${verifyUrl}`)
  }

  return NextResponse.json({ ok: true })
}
