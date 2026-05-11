import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { rateLimit } from "@/lib/rate-limit"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "@/lib/ai/providers/types"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limit = rateLimit(`ai:${session.user.id}`, 20, 60000)
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { action, data, boardId } = body

    if (!action) {
      return NextResponse.json({ error: "Action required" }, { status: 400 })
    }

    const resolvedBoardId: string = boardId ?? "global"

    if (resolvedBoardId !== "global") {
      try {
        await assertBoardAccess({ userId: session.user.id, boardId: resolvedBoardId })
      } catch (e) {
        return toNextResponse(e)
      }
    }

    let result: unknown

    switch (action) {
      case "whatsapp_greeting": {
        const { name, context } = data || {}
        const messages: AIMessage[] = [
          {
            role: "system",
            content:
              "You are a friendly assistant for an insurance broker. Write short, professional WhatsApp messages. Max 2 sentences. Personal but not pushy.",
          },
          {
            role: "user",
            content: `Create a greeting for ${name || "customer"}${context ? `. Context: ${context}` : ""}`,
          },
        ]
        const res = await aiRegistry.execute({ boardId: resolvedBoardId, purpose: "main", messages, maxTokens: 500 })
        result = { content: res.content, usage: { prompt_tokens: res.usage.inputTokens, completion_tokens: res.usage.outputTokens, total_tokens: res.usage.totalTokens } }
        break
      }

      case "whatsapp_followup": {
        const { name, lastContact, context } = data || {}
        const messages: AIMessage[] = [
          {
            role: "system",
            content:
              "You are a friendly assistant for an insurance broker. Write a short WhatsApp follow-up message. Max 2 sentences. Not pushy.",
          },
          {
            role: "user",
            content: `Follow-up for ${name || "customer"}. Last contact: ${lastContact || "recently"}${context ? `. Context: ${context}` : ""}`,
          },
        ]
        const res = await aiRegistry.execute({ boardId: resolvedBoardId, purpose: "main", messages, maxTokens: 500 })
        result = { content: res.content, usage: { prompt_tokens: res.usage.inputTokens, completion_tokens: res.usage.outputTokens, total_tokens: res.usage.totalTokens } }
        break
      }

      case "qualify_lead": {
        const { conversation } = data || {}
        if (!Array.isArray(conversation)) {
          return NextResponse.json({ error: "conversation array required" }, { status: 400 })
        }
        const messages: AIMessage[] = [
          {
            role: "system",
            content: `Analyze this conversation and score the lead.
Return JSON:
{
  "score": 1-100,
  "readyToBuy": true/false,
  "budgetIndication": "low/medium/high/unknown",
  "nextAction": "string",
  "summary": "string"
}`,
          },
          { role: "user", content: conversation.join("\n") },
        ]
        const res = await aiRegistry.execute({ boardId: resolvedBoardId, purpose: "classification", messages, maxTokens: 1000, temperature: 0.3 })
        try {
          result = JSON.parse(res.content)
        } catch {
          result = { score: 50, readyToBuy: false, nextAction: "Check manually", summary: res.content }
        }
        break
      }

      case "custom": {
        const { messages: rawMessages, temperature, maxTokens } = data || {}
        if (!Array.isArray(rawMessages)) {
          return NextResponse.json({ error: "messages array required" }, { status: 400 })
        }
        const messages: AIMessage[] = rawMessages.map((m: { role: string; content: string }) => ({
          role: m.role as AIMessage["role"],
          content: m.content,
        }))
        const res = await aiRegistry.execute({
          boardId: resolvedBoardId,
          purpose: "main",
          messages,
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? 2000,
        })
        result = { content: res.content, usage: { prompt_tokens: res.usage.inputTokens, completion_tokens: res.usage.outputTokens, total_tokens: res.usage.totalTokens } }
        break
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("AI Chat API Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
