import { NextRequest, NextResponse } from "next/server"
import { runPeriodicAudit } from "@/lib/supervisor/triggers/periodic"

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  if (process.env.CRON_ROUTES_ENABLED !== "true") {
    return new NextResponse(null, { status: 204 })
  }

  const authHeader = req.headers.get("authorization")
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const boardId = url.searchParams.get("boardId") ?? undefined

  const triggered = await runPeriodicAudit(boardId)

  return NextResponse.json({ ok: true, triggered })
}
