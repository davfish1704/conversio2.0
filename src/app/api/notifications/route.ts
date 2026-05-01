import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const notifications = await prisma.adminNotification.findMany({
    where: { resolved: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ notifications })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await req.json()
  await prisma.adminNotification.update({ where: { id }, data: { resolved: true } })
  return NextResponse.json({ ok: true })
}
