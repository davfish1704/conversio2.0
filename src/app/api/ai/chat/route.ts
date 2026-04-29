import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"
import { generateWhatsAppGreeting, generateWhatsAppFollowUp, qualifyLead, groqChat } from "@/lib/ai/groq-client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Rate Limit: 20 AI-Requests pro Minute pro User
  const limit = rateLimit(`ai:${session.user.id}`, 20, 60000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { action, data } = body

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 })
    }

    let result: any

    switch (action) {
      case "whatsapp_greeting": {
        const { name, context } = data || {}
        result = await generateWhatsAppGreeting(name || "Kunde", context)
        break
      }

      case "whatsapp_followup": {
        const { name, lastContact, context } = data || {}
        result = await generateWhatsAppFollowUp(name || "Kunde", lastContact || "vor kurzem", context)
        break
      }

      case "qualify_lead": {
        const { conversation } = data || {}
        if (!Array.isArray(conversation)) {
          return NextResponse.json({ error: "conversation array required" }, { status: 400 })
        }
        result = await qualifyLead(conversation)
        break
      }

      case "custom": {
        const { messages, model, temperature, maxTokens } = data || {}
        if (!Array.isArray(messages)) {
          return NextResponse.json({ error: "messages array required" }, { status: 400 })
        }
        result = await groqChat(messages, model || "llama-3.1-8b-instant", temperature || 0.7, maxTokens || 2000)
        break
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("AI Chat API Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
