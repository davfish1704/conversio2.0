import type { AIMessage } from "@/lib/ai/providers/types"

type GroqMessage = Pick<AIMessage, "role" | "content"> & { role: "system" | "user" | "assistant" }

interface BrainConfig {
  systemPrompt: string
  stylePrompt: string
  infoPrompt: string
  rulePrompt: string
  language?: string
  tone?: string
}

interface StateConfig {
  name: string
  type: string
  mission: string | null
  rules: string | null
  dataToCollect?: string[]
}

interface LeadContext {
  customData?: Record<string, unknown>
}

interface MessageEntry {
  direction: string
  content: string
}

interface BrainExtra {
  documents?: { name: string; content: string }[]
  rules?: { name: string; rule: string }[]
  faqs?: { question: string; answer: string }[]
}

export function buildPrompt(
  brain: BrainConfig,
  state: StateConfig,
  lead: LeadContext,
  history: MessageEntry[],
  userMessage: string,
  extra?: BrainExtra
): GroqMessage[] {
  const parts: string[] = []

  parts.push(brain.systemPrompt || "Du bist ein hilfreicher Assistent.")
  parts.push(`\nSTIL: ${brain.stylePrompt || "Professionell und freundlich."}`)
  parts.push(`\nWISSEN: ${brain.infoPrompt || ""}`)

  if (extra?.documents?.length) {
    parts.push("\nDOKUMENTE:\n" + extra.documents.map(d => `${d.name}: ${d.content}`).join("\n\n"))
  }
  if (extra?.faqs?.length) {
    parts.push("\nFAQs:\n" + extra.faqs.map(f => `F: ${f.question}\nA: ${f.answer}`).join("\n\n"))
  }
  if (extra?.rules?.length) {
    parts.push("\nREGELN:\n" + extra.rules.map(r => r.rule).join("\n"))
  }
  parts.push(`\nBOARD-REGELN: ${brain.rulePrompt || ""}`)

  parts.push(`\n---\nAKTUELLER STATE: ${state.name}`)
  parts.push(`MISSION: ${state.mission || "Hilf dem Kunden."}`)
  if (state.rules) parts.push(`STATE-REGELN: ${state.rules}`)

  const dataToCollect = state.dataToCollect || []
  if (dataToCollect.length > 0) {
    const knownKeys = lead.customData ? Object.keys(lead.customData) : []
    const needed = dataToCollect.filter(k => !knownKeys.includes(k))
    if (needed.length > 0) {
      parts.push(`\nNOCH ZU SAMMELN: ${needed.join(", ")}`)
    }
  }

  const known =
    lead.customData && Object.keys(lead.customData).length > 0
      ? Object.entries(lead.customData)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : null
  if (known) parts.push(`\nBEREITS BEKANNT: ${known}`)

  const systemContent = parts.join("\n")

  const messages: GroqMessage[] = [{ role: "system", content: systemContent }]

  for (const msg of history.slice(-10)) {
    messages.push({
      role: msg.direction === "OUTBOUND" ? "assistant" : "user",
      content: msg.content,
    })
  }

  messages.push({ role: "user", content: userMessage })
  return messages
}
