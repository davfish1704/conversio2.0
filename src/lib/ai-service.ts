import { aiRegistry } from "./ai/registry"
import { buildPrompt } from "./ai/prompt-builder"

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
  boardId?: string
}

export interface State {
  id: string
  name: string
  type: string
  mission: string | null
  rules: string | null
  config: unknown
}

export interface MessageContext {
  direction: string
  content: string
  timestamp: Date
}

export async function generateAIResponse(
  brain: BoardBrain,
  state: State,
  history: MessageContext[],
  userMessage: string,
  boardId?: string
): Promise<string> {
  const messages = buildPrompt(brain, state, {}, history, userMessage)

  try {
    const result = await aiRegistry.execute({
      boardId: boardId ?? brain.boardId ?? "unknown",
      purpose: "main",
      messages,
      temperature: brain.temperature ?? 0.7,
      maxTokens: brain.maxTokens ?? 500,
    })

    if (!result.content) throw new Error("Empty AI response")
    return result.content
  } catch (error) {
    console.error("❌ AI generation failed:", error)
    return getFallbackResponse(state, brain.language)
  }
}

function getFallbackResponse(state: State, language: string): string {
  if (state.type === "MESSAGE") {
    const config = state.config as Record<string, unknown> | null
    if (config?.text) return String(config.text)
  }

  const fallbacks: Record<string, string> = {
    de: "Entschuldigung, ich habe gerade technische Probleme. Ein Mitarbeiter wird sich bald bei Ihnen melden.",
    en: "Sorry, I'm experiencing technical difficulties. A team member will reach out to you shortly.",
  }

  return fallbacks[language] || fallbacks.en
}
