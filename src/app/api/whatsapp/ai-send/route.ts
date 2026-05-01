import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { aiRegistry } from "@/lib/ai/registry"
import { rateLimit } from "@/lib/rate-limit"

async function generateMessage(
  action: "greeting" | "followup" | "custom",
  contactName: string,
  opts: { context?: string; lastContact?: string; prompt?: string }
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  let systemContent: string
  let userContent: string

  if (action === "greeting") {
    systemContent = "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe kurze, professionelle WhatsApp-Nachrichten auf Deutsch. Maximal 2 Sätze."
    userContent = `Erstelle eine Begrüßung für ${contactName}${opts.context ? `. Kontext: ${opts.context}` : ""}`
  } else if (action === "followup") {
    systemContent = "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe eine kurze WhatsApp-Follow-up-Nachricht auf Deutsch. Maximal 2 Sätze. Nicht aufdringlich."
    userContent = `Follow-up für ${contactName}. Letzter Kontakt: ${opts.lastContact ?? "vor kurzem"}${opts.context ? `. Kontext: ${opts.context}` : ""}`
  } else {
    systemContent = "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe kurze WhatsApp-Nachrichten auf Deutsch. Maximal 2 Sätze."
    userContent = opts.prompt!
  }

  const res = await aiRegistry.execute({
    boardId: "global",
    purpose: "main",
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ],
  })

  return {
    content: res.content,
    usage: {
      prompt_tokens: res.usage.inputTokens,
      completion_tokens: res.usage.outputTokens,
      total_tokens: res.usage.totalTokens,
    },
  }
}

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
      conversation = await (prisma as any).conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { timestamp: "desc" }, take: 10 },
          lead: { select: { name: true } },
        },
      })

      if ((conversation as any)?.lead?.name) {
        contactName = (conversation as any).lead.name
      }
    }

    let result: { content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }

    try {
      switch (action) {
        case "greeting":
          result = await generateMessage("greeting", contactName, {
            context: data?.context || conversation?.source || "",
          })
          break

        case "followup": {
          const lastContact = conversation?.lastMessageAt
            ? new Date(conversation.lastMessageAt).toLocaleDateString("de-DE")
            : "vor kurzem"
          result = await generateMessage("followup", contactName, { lastContact, context: data?.context })
          break
        }

        case "custom":
          if (!data?.prompt) {
            return NextResponse.json({ error: "custom action requires data.prompt" }, { status: 400 })
          }
          result = await generateMessage("custom", contactName, { prompt: data.prompt })
          break

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

    const generatedContent = result.content
    const aiUsage = result.usage

    // Resolve phone number ID via BoardChannel
    let phoneNumberId = data?.phoneNumberId
    let resolvedAccessToken: string | null = null

    if (!phoneNumberId && conversation?.boardId) {
      const { decrypt } = await import("@/lib/crypto/secrets")
      const bc = await prisma.boardChannel.findUnique({
        where: { boardId_platform: { boardId: conversation.boardId, platform: "whatsapp" } },
        select: { waPhoneNumberId: true, waAccessToken: true },
      })
      if (bc?.waPhoneNumberId && bc.waAccessToken) {
        phoneNumberId = bc.waPhoneNumberId
        resolvedAccessToken = decrypt(bc.waAccessToken)
      }
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: "No WhatsApp account found. Please configure a phone number." },
        { status: 400 }
      )
    }

    // Send via Meta API
    const accessToken = resolvedAccessToken || process.env.META_ACCESS_TOKEN
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

    console.log("🤖 AI Usage:", {
      action,
      tokens: aiUsage.total_tokens,
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
