import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authLimiter, tooManyRequests } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { z } from "zod"

const signupSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
})

async function sendVerificationEmail(email: string, name: string, token: string) {
  if (!process.env.NEXT_PUBLIC_APP_URL && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL ist nicht gesetzt")
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const verifyUrl = `${appUrl}/verify-email?token=${token}`

  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Conversio <noreply@conversio.de>",
        to: email,
        subject: "Bitte bestätige deine E-Mail-Adresse",
        html: `<p>Hallo ${name},</p><p>Bitte bestätige deine E-Mail-Adresse:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Der Link ist 24 Stunden gültig.</p>`,
      }),
    }).catch(() => {})
  } else {
    console.log(`[verify-email] ${email} → ${verifyUrl}`)
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const limited = await authLimiter(ip)
  if (!limited.success) return tooManyRequests()

  try {
    const body = await request.json()
    const validated = signupSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: "Ungültige Eingabe", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password } = validated.data

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existingUser) {
      return NextResponse.json({ error: "Ein Konto mit dieser E-Mail existiert bereits" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const verifyToken = randomUUID()
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: "USER",
        verifyToken,
        verifyTokenExpiry,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    // Fire-and-forget
    sendVerificationEmail(user.email!, user.name!, verifyToken).catch(() => {})

    return NextResponse.json({ message: "Registrierung erfolgreich", user }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten. Bitte versuche es erneut." }, { status: 500 })
  }
}
