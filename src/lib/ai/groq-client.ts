// src/lib/ai/groq-client.ts
// DEPRECATED — all AI calls now go through AIRegistry (src/lib/ai/registry.ts).
// This file is kept only to avoid import errors in any code not yet migrated.
// Do not add new callers here.

import { aiRegistry } from "@/lib/ai/registry"
import type { AIMessage } from "./providers/types"

export interface GroqMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GroqUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface GroqToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export interface GroqTool {
  type: "function"
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export type GroqToolMessage =
  | GroqMessage
  | { role: "assistant"; content: null; tool_calls: GroqToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

export interface GroqToolResponse {
  content: string | null
  toolCalls: GroqToolCall[]
  finishReason: "stop" | "tool_calls" | "length"
  usage: GroqUsage
}

/** @deprecated Use aiRegistry.execute() instead */
export async function groqChat(
  messages: GroqMessage[],
  _model = "llama-3.1-8b-instant",
  temperature = 0.7,
  maxTokens = 2000
): Promise<{ content: string; usage: GroqUsage }> {
  const res = await aiRegistry.execute({
    boardId: "global",
    purpose: "main",
    messages: messages as AIMessage[],
    temperature,
    maxTokens,
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

/** @deprecated Use aiRegistry.execute() instead */
export async function groqChatWithTools(
  messages: GroqToolMessage[],
  tools: GroqTool[],
  _model = "llama-3.3-70b-versatile",
  temperature = 0.3,
  maxTokens = 1000
): Promise<GroqToolResponse> {
  const aiMessages: AIMessage[] = messages.map((m) => {
    if ("tool_calls" in m) {
      const { tool_calls, ...rest } = m as { role: "assistant"; content: null; tool_calls: GroqToolCall[] }
      return {
        role: "assistant",
        content: rest.content ?? "",
        tool_calls: tool_calls.map((tc) => {
          let args: Record<string, unknown> = {}
          try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }
          return { id: tc.id, name: tc.function.name, arguments: args }
        }),
      }
    }
    if (m.role === "tool") {
      return { role: "tool", tool_call_id: (m as { tool_call_id: string }).tool_call_id, content: m.content }
    }
    return { role: m.role as AIMessage["role"], content: m.content }
  })

  const toolDefs = tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }))

  const res = await aiRegistry.execute({
    boardId: "global",
    purpose: "main",
    messages: aiMessages,
    tools: toolDefs,
    temperature,
    maxTokens,
  })

  return {
    content: res.content || null,
    toolCalls: res.toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
    })),
    finishReason: res.finishReason === "tool_calls" ? "tool_calls" : res.finishReason === "length" ? "length" : "stop",
    usage: {
      prompt_tokens: res.usage.inputTokens,
      completion_tokens: res.usage.outputTokens,
      total_tokens: res.usage.totalTokens,
    },
  }
}

export async function generateWhatsAppGreeting(name: string, context?: string) {
  return groqChat([
    { role: "system", content: "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe kurze, professionelle WhatsApp-Nachrichten auf Deutsch. Maximal 2 Sätze." },
    { role: "user", content: `Erstelle eine Begrüßung für ${name}${context ? `. Kontext: ${context}` : ""}` },
  ])
}

export async function generateWhatsAppFollowUp(name: string, lastContact: string, context?: string) {
  return groqChat([
    { role: "system", content: "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe eine kurze WhatsApp-Follow-up-Nachricht auf Deutsch. Maximal 2 Sätze. Nicht aufdringlich." },
    { role: "user", content: `Follow-up für ${name}. Letzter Kontakt: ${lastContact}${context ? `. Kontext: ${context}` : ""}` },
  ])
}

export async function qualifyLead(conversation: string[]) {
  const result = await groqChat([
    {
      role: "system",
      content: `Analysiere diesen Gesprächsverlauf und bewerte den Lead. Gib ein JSON zurück: {"score":1-100,"readyToBuy":true/false,"budgetIndication":"low/medium/high/unknown","nextAction":"string","summary":"string"}`,
    },
    { role: "user", content: conversation.join("\n") },
  ], "llama-3.1-8b-instant", 0.3, 1000)
  try { return JSON.parse(result.content) } catch { return { score: 50, readyToBuy: false, nextAction: "Manuell prüfen", summary: result.content } }
}

export async function generateFlowStates(userInput: string) {
  const result = await groqChat([
    { role: "system", content: `You are a flow builder assistant. Respond ONLY with valid JSON array of states. No markdown.` },
    { role: "user", content: userInput.trim() },
  ])
  return result.content
}
