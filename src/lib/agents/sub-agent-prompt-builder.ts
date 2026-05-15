import { buildLanguageEnforcement } from "@/lib/ai/prompt/sections/language"

export interface SubAgentBrain {
  systemPrompt: string
  stylePrompt: string
  infoPrompt: string
  rulePrompt: string
  language: string
  tone: string
}

export interface SubAgentKnowledge {
  rules: { name: string; rule: string; severity: string }[]
  faqs: { question: string; answer: string }[]
  docs: { name: string; content: string }[]
}

export interface PromptBuilderInput {
  // New sub-agent fields
  agentRole: string | null
  agentSystemPrompt: string | null
  agentGoal: string | null
  handoffMode: string

  // Classic state fields
  stateName: string
  dataToCollect: string[]

  // Brain / Board config
  brain: SubAgentBrain

  // Knowledge base
  knowledge: SubAgentKnowledge

  // Memory
  memories: { key: string; value: string }[]
  conversationSummary: string | null

  // Execution context
  channel: string
  leadChannels: string[]
  customData: Record<string, unknown>
  language?: string
}

export function buildSubAgentSystemPrompt(input: PromptBuilderInput): string {
  const parts: string[] = []

  // ── Section 1: Agent Identity ──────────────────────────────────────────────
  if (input.agentRole) {
    parts.push(`## Deine Rolle\n${input.agentRole}`)
  } else if (input.brain.systemPrompt) {
    parts.push(input.brain.systemPrompt)
  }

  // ── Section 2: Agent Goal ──────────────────────────────────────────────────
  if (input.agentGoal) {
    parts.push(`## Dein Ziel in diesem State\n${input.agentGoal}`)
  }

  // ── Section 3: Detailed Instructions ──────────────────────────────────────
  if (input.agentSystemPrompt) {
    parts.push(`## Anweisungen\n${input.agentSystemPrompt}`)
  }

  // ── Section 4: Board Context (Style, Info, Rules) ──────────────────────────
  if (input.brain.stylePrompt) {
    parts.push(`## Stil & Ton\n${input.brain.stylePrompt}`)
  }
  if (input.brain.infoPrompt) {
    parts.push(`## Kontext-Wissen\n${input.brain.infoPrompt}`)
  }
  if (input.brain.rulePrompt) {
    parts.push(`## Board-Regeln\n${input.brain.rulePrompt}`)
  }

  // ── Section 5: Knowledge Base ──────────────────────────────────────────────
  if (input.knowledge.rules.length > 0) {
    const lines = input.knowledge.rules.map((r) => `- [${r.severity.toUpperCase()}] ${r.rule}`)
    parts.push(`## Einschränkungen\n${lines.join("\n")}`)
  }

  if (input.knowledge.faqs.length > 0) {
    const lines = input.knowledge.faqs.map((f) => `F: ${f.question}\nA: ${f.answer}`)
    parts.push(`## FAQs\n${lines.join("\n\n")}`)
  }

  if (input.knowledge.docs.length > 0) {
    const MAX_CHARS = 3000
    let remaining = MAX_CHARS
    const snippets: string[] = []
    for (const doc of input.knowledge.docs) {
      if (remaining <= 0) break
      const snippet = doc.content.slice(0, remaining)
      snippets.push(`### ${doc.name}\n${snippet}`)
      remaining -= snippet.length
    }
    parts.push(`## Wissensdatenbank\n${snippets.join("\n\n")}`)
  }

  // ── Section 6: Memory & Collected Data ────────────────────────────────────
  if (input.conversationSummary) {
    parts.push(`## Gesprächszusammenfassung\n${input.conversationSummary}`)
  }

  if (input.memories.length > 0) {
    const lines = input.memories.map((m) => `${m.key}: ${m.value}`)
    parts.push(`## Bekannte Informationen\n${lines.join("\n")}`)
  }

  const customKeys = Object.keys(input.customData)
  if (customKeys.length > 0) {
    const lines = customKeys.map((k) => `${k}: ${input.customData[k]}`)
    parts.push(`## Lead-Daten\n${lines.join("\n")}`)
  }

  if (input.dataToCollect.length > 0) {
    const collected = new Set(input.memories.map((m) => m.key))
    const needed = input.dataToCollect.filter((k) => !collected.has(k))
    if (needed.length > 0) {
      parts.push(
        `## Noch zu erfassen\n${needed.join(", ")}\nNutze das Tool \`update_lead_data\`, sobald der Kunde diese Informationen nennt.`,
      )
    } else {
      parts.push(`## Datenerfassung\nAlle erforderlichen Felder wurden erfasst.`)
    }
  }

  // ── Section 7: Execution Context & Language ────────────────────────────────
  const contextLines: string[] = [`Aktiver Kanal: ${input.channel}`]
  if (input.leadChannels.length > 0) {
    contextLines.push(`Lead-Kanäle: ${[...new Set(input.leadChannels)].join(", ")}`)
  }
  contextLines.push(`Aktueller State: ${input.stateName}`)
  parts.push(`## Ausführungskontext\n${contextLines.join("\n")}`)

  // Handoff guidance
  if (input.handoffMode !== "RULE_ONLY") {
    parts.push(
      `## Handoff\nWenn du überzeugt bist, dass deine Aufgabe in diesem State vollständig erledigt ist, rufe das Tool \`handoff_proposed\` auf. Rufe es NICHT auf, wenn du noch auf eine Antwort des Leads wartest oder wenn die Konversation noch läuft.`,
    )
  }

  const lang = input.language ?? input.brain.language ?? "de"
  parts.push(buildLanguageEnforcement(lang))

  return parts.join("\n\n")
}
