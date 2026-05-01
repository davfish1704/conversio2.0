import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // v3: AdminNotification → AdminReport (status OPEN = unresolved)
  const notifications = await (prisma as any).adminReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json({ notifications })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await req.json()
  // v3: resolve → set status RESOLVED
  await (prisma as any).adminReport.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
