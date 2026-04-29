// src/lib/ai/groq-client.ts
// Zentraler Groq Client für Conversio

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_BASE_URL = "https://api.groq.com/openai/v1"

if (!GROQ_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("⚠️ GROQ_API_KEY nicht gesetzt")
}

export interface GroqMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GroqUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

// ── Tool-Calling Types ────────────────────────────────────────────────────────

export interface GroqToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string  // JSON-encoded string
  }
}

export interface GroqTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>  // JSON Schema object
  }
}

// Union für messages-Arrays die Tool-Rollen enthalten (role: "tool" / assistant mit tool_calls)
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

export async function groqChat(
  messages: GroqMessage[],
  model: string = "llama-3.1-8b-instant",
  temperature: number = 0.7,
  maxTokens: number = 2000
): Promise<{ content: string; usage: GroqUsage }> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY nicht konfiguriert")
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API Fehler: ${response.status} - ${error}`)
  }

  const data = await response.json()

  return {
    content: data.choices[0]?.message?.content || "",
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  }
}

export async function groqChatWithTools(
  messages: GroqToolMessage[],
  tools: GroqTool[],
  model: string = "llama-3.3-70b-versatile",
  temperature: number = 0.3,
  maxTokens: number = 1000
): Promise<GroqToolResponse> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY nicht konfiguriert")
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API Fehler (tool-calling): ${response.status} - ${error}`)
  }

  const data = await response.json()
  const choice = data.choices[0]

  return {
    content: choice?.message?.content ?? null,
    toolCalls: choice?.message?.tool_calls ?? [],
    finishReason: choice?.finish_reason ?? "stop",
    usage: {
      prompt_tokens: data.usage?.prompt_tokens || 0,
      completion_tokens: data.usage?.completion_tokens || 0,
      total_tokens: data.usage?.total_tokens || 0,
    },
  }
}

// ── Spezialisierte Funktionen für Conversio ───────────────────────────────────

export async function generateWhatsAppGreeting(name: string, context?: string) {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe kurze, professionelle WhatsApp-Nachrichten auf Deutsch. Maximal 2 Sätze. Persönlich, aber nicht zu verkäuferisch.",
    },
    {
      role: "user",
      content: `Erstelle eine Begrüßung für ${name}${context ? `. Kontext: ${context}` : ""}`,
    },
  ]

  return groqChat(messages, "llama-3.1-8b-instant", 0.7, 500)
}

export async function generateWhatsAppFollowUp(name: string, lastContact: string, context?: string) {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "Du bist ein freundlicher Assistent für einen Versicherungsmakler. Schreibe eine kurze WhatsApp-Follow-up-Nachricht auf Deutsch. Maximal 2 Sätze. Nicht aufdringlich.",
    },
    {
      role: "user",
      content: `Follow-up für ${name}. Letzter Kontakt: ${lastContact}${context ? `. Kontext: ${context}` : ""}`,
    },
  ]

  return groqChat(messages, "llama-3.1-8b-instant", 0.6, 500)
}

export async function qualifyLead(conversation: string[]) {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: `Analysiere diesen Gesprächsverlauf und bewerte den Lead.
Gib ein JSON zurück:
{
  "score": 1-100,
  "readyToBuy": true/false,
  "budgetIndication": "low/medium/high/unknown",
  "nextAction": "string",
  "summary": "string"
}`,
    },
    {
      role: "user",
      content: conversation.join("\n"),
    },
  ]

  const result = await groqChat(messages, "llama-3.1-8b-instant", 0.3, 1000)
  
  try {
    return JSON.parse(result.content)
  } catch {
    return { 
      score: 50, 
      readyToBuy: false, 
      nextAction: "Manuell prüfen", 
      summary: result.content 
    }
  }
}

export async function generateFlowStates(userInput: string) {
  const systemPrompt = `You are a flow builder assistant. You MUST respond with ONLY valid JSON. No markdown, no explanation, no code blocks.

Generate a flow with these states:
- Each state has: id, name, type (message|condition|action), message, nextState
- Types: "message" (send text), "condition" (if/else), "action" (do something)
- Example response:
[{"id":"welcome","name":"Welcome","type":"message","message":"Hello! How can I help?","nextState":"qualify"},{"id":"qualify","name":"Qualify","type":"condition","condition":"interested","yes":"schedule","no":"goodbye"},{"id":"goodbye","name":"Goodbye","type":"message","message":"Thanks!","nextState":null}]

User request: ${userInput}

Respond ONLY with valid JSON array. No other text.`

  const result = await groqChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userInput.trim() },
  ], "llama-3.1-8b-instant", 0.7, 2000)

  return result.content
}
