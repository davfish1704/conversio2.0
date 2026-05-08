import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  const { token } = await req.json() as { token?: string }
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 })

  const user = await prisma.user.findFirst({
    where: {
      verifyToken: token,
      verifyTokenExpiry: { gt: new Date() },
    },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Token ungültig oder abgelaufen" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verifyToken: null,
      verifyTokenExpiry: null,
    },
  })

  return NextResponse.json({ ok: true })
}
