import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Global WhatsApp account removed. Use Board Settings → Channels." }, { status: 410 })
}
