import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "Global WhatsApp account removed. Use Board Settings → Channels." }, { status: 410 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Global WhatsApp account removed. Use Board Settings → Channels." }, { status: 410 })
}
