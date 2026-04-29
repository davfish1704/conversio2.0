import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { generateWhatsAppGreeting, generateWhatsAppFollowUp, groqChat } from "@/lib/ai/groq-client"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate Limit: 10 AI-WhatsApp-Nachrichten pro Minute pro User (R4)
    const limit = rateLimit(`whatsapp-ai:${session.user.id}`, 10, 60000)
    if (!limit.success) {
      return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 })
    }

    const body = await req.json()
    const { to, conversationId, action, data } = body

    if (!to || !action) {
      return NextResponse.json(
        { error: "Missing required fields: to, action" },
        { status: 400 }
      )
    }

    // Resolve conversation for context
    let conversation = null
    let contactName = data?.name || "Kunde"
    
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { 
          messages: { orderBy: { timestamp: "desc" }, take: 10 },
        },
      })
      
      if (conversation?.customerName) {
        contactName = conversation.customerName
      }
    }

    // Generate message based on action
    let generatedContent: string
    let aiUsage: any = null

    try {
      switch (action) {
        case "greeting": {
          const result = await generateWhatsAppGreeting(
            contactName,
            data?.context || conversation?.source || ""
          )
          generatedContent = result.content
          aiUsage = result.usage
          break
        }

        case "followup": {
          const lastContact = conversation?.lastMessageAt 
            ? new Date(conversation.lastMessageAt).toLocaleDateString("de-DE")
            : "vor kurzem"
          const result = await generateWhatsAppFollowUp(
            contactName,
            lastContact,
            data?.context
          )
          generatedContent = result.content
          aiUsage = result.usage
          break
        }

        case "custom": {
          if (!data?.prompt) {
            return NextResponse.json({ error: "custom action requires data.prompt" }, { status: 400 })
          }
          const result = await groqChat([
            { role: "system", content: "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe kurze WhatsApp-Nachrichten auf Deutsch. Maximal 2 Sätze." },
            { role: "user", content: data.prompt },
          ])
          generatedContent = result.content
          aiUsage = result.usage
          break
        }

        default:
          return NextResponse.json({ error: "Unknown action. Use: greeting, followup, custom" }, { status: 400 })
      }
    } catch (aiError) {
      console.error("❌ AI generation error:", aiError)
      return NextResponse.json(
        { error: "AI message generation failed", details: aiError instanceof Error ? aiError.message : "Unknown" },
        { status: 500 }
      )
    }

    // Resolve phone number ID
    let phoneNumberId = data?.phoneNumberId
    if (!phoneNumberId && conversation?.waAccountId) {
      const waAccount = await prisma.whatsAppAccount.findUnique({
        where: { id: conversation.waAccountId },
      })
      if (waAccount) {
        phoneNumberId = waAccount.phoneNumber
      }
    }

    if (!phoneNumberId) {
      const waAccount = await prisma.whatsAppAccount.findFirst({
        where: { status: "ACTIVE" },
      })
      if (waAccount) {
        phoneNumberId = waAccount.phoneNumber
      }
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "No WhatsApp account found. Please configure a phone number." },
        { status: 400 }
      )
    }

    // Send via Meta API
    const accessToken = process.env.META_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: "META_ACCESS_TOKEN not configured" },
        { status: 500 }
      )
    }

    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: generatedContent },
        }),
      }
    )

    const metaData = await metaResponse.json()

    if (!metaResponse.ok) {
      console.error("❌ Meta WhatsApp API error:", metaData)
      return NextResponse.json(
        { success: false, error: metaData.error?.message || "Meta API error" },
        { status: metaResponse.status }
      )
    }

    const messageId = metaData.messages?.[0]?.id

    // Save to DB
    let dbMessage = null
    if (conversationId) {
      dbMessage = await prisma.message.create({
        data: {
          conversationId,
          direction: "OUTBOUND",
          content: generatedContent,
          messageType: "TEXT",
          status: "SENT",
          externalId: messageId,
        },
      })

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      })
    }

    // Log AI usage for cost tracking
    console.log("🤖 AI Usage:", {
      action,
      model: "llama-3.1-8b-instant",
      tokens: aiUsage?.total_tokens || 0,
      conversationId,
    })

    return NextResponse.json({
      success: true,
      message: generatedContent,
      messageId,
      dbMessageId: dbMessage?.id,
      aiUsage,
    })
  } catch (error) {
    console.error("❌ WhatsApp AI send error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
