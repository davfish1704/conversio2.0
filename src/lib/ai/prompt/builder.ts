import type { AIMessage } from "@/lib/ai/providers/types"
import { buildLanguageEnforcement } from "./sections/language"

export interface PromptBrain {
  systemPrompt: string
  stylePrompt: string
  infoPrompt: string
  rulePrompt: string
  language: string
  tone: string
  temperature?: number
  maxTokens?: number
}

export interface PromptState {
  id: string
  name: string
  type: string
  nextStateId?: string | null
  dataToCollect?: string[]
  completionRule?: string | null
  availableTools?: string[]
}

export interface PromptMemory {
  key: string
  value: string
}

export interface PromptKnowledge {
  rules: { id: string; name: string; rule: string; severity: string }[]
  faqs: { id: string; question: string; answer: string }[]
  docs: { id: string; name: string; content: string }[]
}

export interface PromptTransition {
  fromState: string | null
  toState: string
}

export interface PromptOptions {
  channel: string
  leadChannels: string[]
  conversationSummary: string | null
  customData: Record<string, unknown>
  transition?: PromptTransition | null
  language?: string
}

export function buildSystemPrompt(
  brain: PromptBrain,
  state: PromptState,
  memories: PromptMemory[],
  knowledge: PromptKnowledge,
  options: PromptOptions,
): string {
  const parts: string[] = []

  if (brain.systemPrompt) parts.push(brain.systemPrompt)

  parts.push(`## Style & Tone\nSTYLE: ${brain.stylePrompt || "Professional and friendly"}`)

  if (brain.infoPrompt) parts.push(`## Context Knowledge\n${brain.infoPrompt}`)

  if (brain.rulePrompt) parts.push(`## Board Rules\n${brain.rulePrompt}`)

  if (knowledge.rules.length > 0) {
    parts.push(
      `## Constraints\n${knowledge.rules.map((r) => `- ${r.rule}`).join("\n")}`,
    )
  }

  if (knowledge.faqs.length > 0) {
    parts.push(
      `## FAQs\n${knowledge.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`,
    )
  }

  if (knowledge.docs.length > 0) {
    const MAX_TOTAL_CHARS = 3000
    let remaining = MAX_TOTAL_CHARS
    const snippets: string[] = []
    for (const doc of knowledge.docs) {
      if (remaining <= 0) break
      const snippet = doc.content.slice(0, remaining)
      snippets.push(`### ${doc.name}\n${snippet}`)
      remaining -= snippet.length
    }
    parts.push(`## Knowledge Base\n${snippets.join("\n\n")}`)
  }

  if (options.conversationSummary) {
    parts.push(
      `## Conversation Summary (previous messages)\n${options.conversationSummary}`,
    )
  }

  if (options.transition) {
    const t = options.transition
    if (t.fromState) {
      parts.push(
        `## State Transition\nConversation moved from "${t.fromState}" to "${t.toState}".\nNew context: previous state information may still be relevant where applicable.`,
      )
    }
  }

  parts.push(`## Current Context\n- Active channel: ${options.channel}`)
  if (options.leadChannels.length > 0) {
    parts.push(`- Lead's channels: ${[...new Set(options.leadChannels)].join(", ")}`)
  }

  parts.push(`\nCURRENT STATE: ${state.name}`)

  if (memories.length > 0) {
    parts.push(`\nMEMORY:\n${memories.map((m) => `${m.key}: ${m.value}`).join("\n")}`)
  }

  const dataToCollect = state.dataToCollect ?? []
  if (dataToCollect.length > 0) {
    const collectedKeys = memories.map((m) => m.key)
    const needed = dataToCollect.filter((k) => !collectedKeys.includes(k))
    if (needed.length > 0) {
      parts.push(
        `\nDATA TO COLLECT: ${needed.join(", ")}\nUse the update_lead_data tool to save values when the customer provides them.`,
      )
    } else {
      parts.push("\nDATA COLLECTION: All required fields have been collected.")
    }
  }

  const customKeys = Object.keys(options.customData)
  if (customKeys.length > 0) {
    parts.push(
      `KNOWN DATA: ${customKeys.map((k) => `${k}: ${options.customData[k]}`).join(", ")}`,
    )
  }

  const lang = options.language || brain.language || "en"
  parts.push(buildLanguageEnforcement(lang))

  return parts.join("\n\n")
}

export function buildPromptMessages(
  systemPrompt: string,
  history: { direction: string; content: string }[],
  userMessage: string,
  maxHistory: number = 20,
): AIMessage[] {
  const messages: AIMessage[] = [{ role: "system", content: systemPrompt }]

  const recent = history.slice(-maxHistory)
  for (const msg of recent) {
    messages.push({
      role: msg.direction === "OUTBOUND" ? "assistant" : "user",
      content: msg.content,
    })
  }

  messages.push({ role: "user", content: userMessage })
  return messages
}

export function sanitizeAIOutput(text: string): string {
  let cleaned = text

  cleaned = cleaned.replace(/<function=[^>]+>[^<]*<\/function>/gi, "")
  cleaned = cleaned.replace(/<function=[^>]+\/>/gi, "")
  cleaned = cleaned.replace(/<function\(\w+\)[\s\S]*?<\/function>/gi, "")
  cleaned = cleaned.replace(/\{?\s*"function"\s*:\s*"[^"]+"\s*\}?/gi, "")
  cleaned = cleaned.replace(
    /(?:Here(?:'s| is) the (?:result|response|output)(?::| of))?.*?(?:OK|FEHLER|ERROR):\s*\{[^}]*\}/gi,
    "",
  )

  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return cleaned
}
