import { NextRequest, NextResponse } from "next/server"
import { runSupervisorScan } from "@/lib/supervisor/supervisor-scan"

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
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

  const result = await runSupervisorScan(boardId)

  return NextResponse.json({ ok: true, ...result })
}
