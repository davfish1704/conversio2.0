import { NextRequest, NextResponse } from "next/server"
import { processNextBatch } from "@/lib/jobs/runner"

// Called by Vercel Cron every minute. Also callable in dev via POST.
export async function POST(req: NextRequest) {
  // Verify Vercel cron secret in production
  const authHeader = req.headers.get("authorization")
  if (
    process.env.NODE_ENV === "production" &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const processed = await processNextBatch(20)
  return NextResponse.json({ ok: true, processed })
}


// Vercel Cron calls GET
export async function GET(req: NextRequest) {
  return POST(req)
}
