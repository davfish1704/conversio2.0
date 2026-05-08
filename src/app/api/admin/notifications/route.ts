import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true"

  const notifications = await prisma.adminNotification.findMany({
    where: unreadOnly ? { read: false } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ notifications })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { ids, all } = await req.json() as { ids?: string[]; all?: boolean }

  if (all) {
    await prisma.adminNotification.updateMany({ where: { read: false }, data: { read: true } })
  } else if (ids?.length) {
    await prisma.adminNotification.updateMany({ where: { id: { in: ids } }, data: { read: true } })
  }

  return NextResponse.json({ ok: true })
}
