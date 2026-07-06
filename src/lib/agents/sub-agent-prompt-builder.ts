import { buildLanguageEnforcement } from "@/lib/ai/prompt/sections/language"
import type { QualificationField } from "@/lib/types"

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

  // Structured qualification slots (from board.boardCustomFields)
  qualificationFields?: QualificationField[]
  /** Current state ID — used to filter fields by stateKeys. */
  currentStateId?: string

  /** Automatically retrieved assets matching the user's request */
  retrievedAssets?: { id: string; name: string; type: string; publicUrl: string; description: string | null }[]
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

  // ── Section 5b: Retrieved Assets ──────────────────────────────────────────
  // Automatically found assets matching the user's request. The AI should
  // reference these naturally and use send_asset to deliver them.
  if (input.retrievedAssets && input.retrievedAssets.length > 0) {
    const lines = input.retrievedAssets.map(
      (a) => `- ${a.name} (${a.type}): ${a.description ?? "Keine Beschreibung"}\n  URL: ${a.publicUrl}`,
    )
    parts.push(`## Gefundene Assets\nDer Lead hat nach Dokumenten oder Medien gefragt. Folgende Assets wurden in der Bibliothek gefunden:\n\n${lines.join("\n\n")}\n\nVerwende \`send_asset\` mit der entsprechenden assetId um das Asset zu versenden. Erwähne das Asset natürlich in deiner Antwort. Versprich NIE ein Dokument das bereits existiert — sende es sofort.`)
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

  // ── Section 6b: Structured Qualification Slots ────────────────────────────
  // Shown when the board has QualificationField definitions. Takes precedence
  // over the legacy dataToCollect string-array section below.
  if (input.qualificationFields && input.qualificationFields.length > 0) {
    const fields = input.qualificationFields.filter(
      (f) =>
        // Show fields assigned to this state, or board-wide fields (stateKeys=[])
        f.stateKeys.length === 0 ||
        (input.currentStateId && f.stateKeys.includes(input.currentStateId)),
    )

    if (fields.length > 0) {
      const filled: string[] = []
      const emptyRequired: string[] = []
      const emptyOptional: string[] = []

      for (const f of fields) {
        const val = input.customData[f.key]
        const isFilled = val !== undefined && val !== null && val !== ""
        const typeHint =
          f.type === "enum" && f.options?.length
            ? `(${f.options.join(" | ")})`
            : f.unit
              ? `(${f.type}, ${f.unit})`
              : `(${f.type})`

        if (isFilled) {
          filled.push(`- ${f.label}: **${val}** ✓`)
        } else if (f.required) {
          emptyRequired.push(`- ${f.label} ${typeHint}`)
        } else {
          emptyOptional.push(`- ${f.label} ${typeHint}`)
        }
      }

      const sectionLines: string[] = []

      if (filled.length > 0) {
        sectionLines.push(`Bereits erfasst:\n${filled.join("\n")}`)
      }
      if (emptyRequired.length > 0) {
        sectionLines.push(`Noch zu erfassen (Pflicht):\n${emptyRequired.join("\n")}`)
      }
      if (emptyOptional.length > 0) {
        sectionLines.push(`Optional:\n${emptyOptional.join("\n")}`)
      }

      if (emptyRequired.length === 0 && emptyOptional.length === 0) {
        sectionLines.push("Alle Qualification-Felder sind erfasst.")
      }

      sectionLines.push(
        "Nutze das Tool `update_qualification` sobald der Lead einen Wert nennt. " +
          "Frag NICHT erneut nach bereits erfassten Werten.",
      )

      parts.push(`## Qualification-Slots\n${sectionLines.join("\n\n")}`)
    }
  } else if (input.dataToCollect.length > 0) {
    // Legacy fallback: plain string-array from State.dataToCollect
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
