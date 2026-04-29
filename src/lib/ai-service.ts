import { groqChat, type GroqMessage } from "./ai/groq-client"

export interface BoardBrain {
  systemPrompt: string
  stylePrompt: string
  infoPrompt: string
  rulePrompt: string
  defaultModel: string
  temperature: number
  maxTokens: number
  language: string
  tone: string
}

export interface State {
  id: string
  name: string
  type: string
  mission: string | null
  rules: string | null
  config: any
}

export interface MessageContext {
  direction: string
  content: string
  timestamp: Date
}

/**
 * Generates an AI response based on brain config, current state and conversation history
 * Uses Groq API (Llama 3.1) instead of OpenAI
 */
export async function generateAIResponse(
  brain: BoardBrain,
  state: State,
  history: MessageContext[],
  userMessage: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(brain, state)
  const messages = buildMessages(systemPrompt, history, userMessage)

  try {
    // Map OpenAI model names to Groq models
    const modelMap: Record<string, string> = {
      "gpt-4o-mini": "llama-3.1-8b-instant",
      "gpt-4o": "llama-3.3-70b-versatile",
      "gpt-4": "llama-3.3-70b-versatile",
      "dummy": "llama-3.1-8b-instant",
    }

    const groqModel = modelMap[brain.defaultModel] || "llama-3.1-8b-instant"

    const result = await groqChat(
      messages,
      groqModel,
      brain.temperature ?? 0.7,
      brain.maxTokens ?? 500
    )

    const response = result.content
    if (!response) {
      throw new Error("Empty AI response")
    }

    return response
  } catch (error) {
    console.error("❌ AI generation failed:", error)
    return getFallbackResponse(state, brain.language)
  }
}

function buildSystemPrompt(brain: BoardBrain, state: State): string {
  const parts = [
    brain.systemPrompt,
    "",
    `STYLE: ${brain.stylePrompt}`,
    "",
    `CONTEXT/KNOWLEDGE: ${brain.infoPrompt}`,
    "",
    `RULES: ${brain.rulePrompt}`,
    "",
    `CURRENT STATE: ${state.name}`,
    `MISSION: ${state.mission || "No mission defined"}`,
    `BEHAVIOR RULES: ${state.rules || "No specific rules"}`,
  ]

  return parts.join("\n")
}

function buildMessages(
  systemPrompt: string,
  history: MessageContext[],
  userMessage: string
): GroqMessage[] {
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
  ]

  // Add history (last 10 messages)
  for (const msg of history) {
    messages.push({
      role: msg.direction === "OUTBOUND" ? "assistant" : "user",
      content: msg.content,
    })
  }

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage,
  })

  return messages
}

function getFallbackResponse(state: State, language: string): string {
  if (state.type === "MESSAGE") {
    const config = state.config as Record<string, any> | null
    if (config?.text) return config.text
  }

  const fallbacks: Record<string, string> = {
    de: "Entschuldigung, ich habe gerade technische Probleme. Ein Mitarbeiter wird sich bald bei Ihnen melden.",
    en: "Sorry, I'm experiencing technical difficulties. A team member will reach out to you shortly.",
  }

  return fallbacks[language] || fallbacks.en
}
