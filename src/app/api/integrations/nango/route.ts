import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { nango } from "@/lib/nango-client"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!nango) {
    return NextResponse.json({ 
      available: false,
      message: "Nango not configured" 
    })
  }

  const integrations = [
    { id: "slack", name: "Slack", connected: false, icon: "💬", color: "bg-purple-100 text-purple-700" },
    { id: "google-calendar", name: "Google Calendar", connected: false, icon: "📅", color: "bg-blue-100 text-blue-700" },
    { id: "hubspot", name: "HubSpot", connected: false, icon: "🎯", color: "bg-orange-100 text-orange-700" },
    { id: "stripe", name: "Stripe", connected: false, icon: "💳", color: "bg-indigo-100 text-indigo-700" },
    { id: "facebook", name: "Facebook Leads", connected: false, icon: "📘", color: "bg-blue-100 text-blue-800" },
    { id: "zoom", name: "Zoom", connected: false, icon: "🎥", color: "bg-blue-100 text-blue-700" },
  ]

  try {
    const connections = await nango.listConnections()
    for (const integration of integrations) {
      integration.connected = connections.connections.some(
        (c: any) => c.provider === integration.id
      )
    }
  } catch (e) {
    console.error("Nango error:", e)
  }

  return NextResponse.json({ available: true, integrations })
}
