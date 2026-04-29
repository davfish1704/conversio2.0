import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || "unknown"
  })
}
