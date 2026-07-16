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

  // ── Section 2: Agent Goal (conditional) ──────────────────────────────────
  if (input.agentGoal) {
    // If memory already contains extracted intent/interests, inject it prominently
    const knownInterest = input.memories.find(
      (m) => m.key === "lastIntent" || m.key === "interest" || m.key === "property_interest"
    )
    const knownInfo = knownInterest
      ? `\n\n⚠️ BEREITS BEKANNT: ${knownInterest.key} = "${knownInterest.value}". Das Ziel gilt als erfüllt — beantworte die Anfrage DIREKT, ohne nach dem Grund zu fragen.`
      : ""

    parts.push(
      `## Dein Ziel in diesem State\n${input.agentGoal}\n` +
      `WICHTIG: Dieses Ziel gilt NUR, solange der Lead sein Anliegen noch NICHT genannt hat. ` +
      `Falls der Lead bereits gesagt hat, warum er kontaktiert oder wonach er fragt ` +
      `(z.B. ein Produktname, eine Immobilie, eine Frage zu Preisen/Dokumenten), ` +
      `dann ist das Ziel BEREITS ERFÜLLT. Wiederhole NICHT die Begrüßung oder die ` +
      `Einstiegsfrage — gehe SOFORT zur inhaltlichen Antwort über.${knownInfo}`
    )
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
      (a) => `- Name: ${a.name} (${a.type})\n  assetId: ${a.id}\n  Beschreibung: ${a.description ?? "Keine Beschreibung"}`,
    )
    parts.push(
      `## Gefundene Assets\nDer Lead hat nach Dokumenten oder Medien gefragt. Folgende Assets wurden in der Bibliothek gefunden:\n\n${lines.join("\n\n")}\n\n` +
      `Um ein Asset zu versenden, rufe \`send_asset\` auf und übergib die assetId (oben angegeben) als Parameter. ` +
      `Schreibe NICHT "[Send Asset: ...]" oder ähnliche Platzhalter als Text — verwende den echten Tool-Aufruf.`
    )
  }

  // ── Section 6: Memory & Collected Data ────────────────────────────────────
  if (input.conversationSummary) {
    parts.push(`## Gesprächszusammenfassung\n${input.conversationSummary}`)
  }

  if (input.memories.length > 0) {
    const lines = input.memories.map((m) => `${m.key}: ${m.value}`)
    parts.push(`## Bekannte Informationen\n${lines.join("\n")}`)

    // Check if memory contains extracted intent about what the lead wants
    const interestKeys = ["lastIntent", "interest", "property_interest", "destination", "budget", "timeline"]
    const knownInterests = input.memories.filter((m) => interestKeys.includes(m.key))
    if (knownInterests.length > 0) {
      const interestLines = knownInterests.map((m) => `  → ${m.key}: "${m.value}"`).join("\n")
      parts.push(
        `## BEREITS BEKANNT — Aus vorherigem Gesprächsverlauf\n` +
        `Folgende Informationen wurden bereits vom Lead genannt oder aus der Konversation extrahiert:\n${interestLines}\n\n` +
        `Diese Informationen gelten als BESTÄTIGT. Du musst nicht erneut nach ihnen fragen. ` +
        `Nutze sie, um deine Antwort direkt darauf aufzubauen.`
      )
    }
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

  // ── CRITICAL: Final Behavioral Rules ─────────────────────────────────────
  // These rules are placed at the END of the prompt (right before conversation
  // history) to maximize recency effect — LLMs follow the last instructions
  // most strongly before generating their response.
  // Rules are in BOTH languages to prevent the model from ignoring them when
  // the conversation switches between German and English.
  const rulesLang = input.language ?? input.brain.language ?? "de"
  const isEnglish = rulesLang === "en"

  parts.push(
    `## ${isEnglish ? "CRITICAL RULES (Highest Priority)" : "WICHTIG — Diese Regeln haben höchste Priorität"}\n` +
    `1. ${isEnglish ? "ANSWER THE LEAD'S QUESTION" : "LEAD-FRAGE BEANTWORTEN"}: ` +
      `${isEnglish
        ? "If the lead has already asked a specific question (about prices, availability, info about a location/product/document), answer it IMMEDIATELY with substance. Do NOT repeat the welcome message ('Welcome!', 'What brought you here?') — the lead has already stated their reason."
        : "Wenn der Lead bereits eine konkrete Frage gestellt hat (nach Preisen, Verfügbarkeit, Infos zu einem Ort, einem Produkt, einem Dokument), beantworte sie SOFORT inhaltlich. Wiederhole NICHT die Begrüßung ('Willkommen!', 'Was führt Sie zu uns?') — der Lead hat sein Anliegen bereits genannt."
      }\n` +
    `2. ${isEnglish ? "NO EMPTY PROMISES" : "KEINE LEEREN VERSPRECHEN"}: ` +
      `${isEnglish
        ? "NEVER say you're sending a document (price list, brochure, file, photo) without actually calling the \`send_asset\` tool in the same turn. If no matching asset exists, say so honestly and offer to connect a human."
        : "Sag NIEMALS, dass du etwas schickst (Preisliste, Broschüre, Dokument, Foto), ohne im selben Durchlauf tatsächlich das Tool \`send_asset\` aufzurufen. Wenn kein passendes Asset existiert, sag ehrlich, dass du es nicht hast."
      }\n` +
    `3. ${isEnglish ? "CONCISE ANSWERS" : "PRÄZISE ANTWORTEN"}: ` +
      `${isEnglish ? "Max 3-4 sentences. At most ONE question per response." : "Maximal 3-4 Sätze. Höchstens EINE Frage pro Antwort."} ` +
      `${isEnglish ? "Write in PLAIN TEXT only — do NOT use Markdown (**bold**, _italic_, # headings)." : "Schreibe im KLARTEXT — verwende KEINE Markdown-Formatierung (**fett**, _kursiv_, # Überschriften)."}\n` +
    `4. ${isEnglish ? "ZERO-FABRICATION RULE — NUMBERS" : "NULL-TOLERANZ BEI ZAHLEN"}: ` +
      `${isEnglish
        ? "NEVER state any specific number — prices, purchase price, ROI, yield, rental income, leasehold duration, payment plan installments, percentages, or any other financial/contractual figure — UNLESS that exact number appears word-for-word in a BrainDocument or in an asset retrieved via search_assets in this conversation. " +
          "If the lead asks for such a number and it is NOT in your context: (a) call search_assets immediately to check the asset library; " +
          "(b) if search_assets returns empty, say HONESTLY that you do not have the exact figure right now and offer to connect a human advisor. " +
          "NEVER estimate, interpolate, or fill gaps from general knowledge. A wrong number destroys trust and can constitute misinformation."
        : "Nenne NIEMALS eine konkrete Zahl — Kaufpreis, Mietrendite, ROI, Laufzeit des Leaseholds, Zahlungsplan-Raten, Prozentsätze oder sonstige finanzielle/vertragliche Angaben — AUSSER diese Zahl steht wörtlich in einem BrainDocument oder in einem via search_assets gefundenen Asset in diesem Gespräch. " +
          "Wenn der Lead nach solchen Zahlen fragt und sie NICHT in deinem Kontext stehen: (a) rufe sofort search_assets auf, um die Asset-Bibliothek zu prüfen; " +
          "(b) wenn search_assets leer zurückkommt, sage EHRLICH, dass du die genauen Zahlen gerade nicht parat hast, und biete an, einen menschlichen Ansprechpartner zu verbinden. " +
          "SCHÄTZE NIEMALS, interpoliere nicht und fülle Lücken NICHT aus Allgemeinwissen. Eine falsche Zahl zerstört Vertrauen und kann als Fehlinformation gelten."
      }\n` +
    `5. ${isEnglish ? "SEARCH ASSETS FOR REAL — NO PRETENDING" : "ASSETS ECHT SUCHEN — NICHT VORTÄUSCHEN"}: ` +
      `${isEnglish
        ? "When the lead asks for prices, brochures, photos, floor plans, or documents: call the REAL \`search_assets\` tool immediately. " +
          "Do NOT write '[Searching assets...]' or any similar placeholder text — that is fake behavior. " +
          "Use the actual tool call. If \`search_assets\` returns no results, that IS the honest answer: tell the lead you have no matching document and offer human escalation. " +
          "If assets are found, call \`send_asset\` to deliver them."
        : "Wenn der Lead nach Preisen, Grundrissen, Broschüren, Fotos oder Dokumenten fragt: rufe SOFORT das echte Tool \`search_assets\` auf. " +
          "Schreibe NICHT '[Searching assets...]' oder ähnliche Platzhalter-Texte — das ist vorgetäuschtes Verhalten. " +
          "Nutze den echten Tool-Aufruf. Wenn \`search_assets\` keine Ergebnisse liefert, ist DAS die ehrliche Antwort: sage dem Lead, dass kein passendes Dokument vorhanden ist, und biete menschliche Eskalation an. " +
          "Wenn Assets gefunden werden, rufe \`send_asset\` auf, um sie zuzustellen."
      }\n` +
    `6. ${isEnglish ? "DO NOT FALL BACK TO WELCOME" : "FALL NICHT IN BEGRÜSSUNG ZURÜCK"}: ` +
      `${isEnglish ? "Never respond with a generic welcome or 'What brought you here?' question. The lead has already stated their interest — address it directly." : "Antworte niemals mit einer Standard-Begrüßung oder 'Was führt Sie zu uns?'. Der Lead hat sein Interesse bereits genannt — gehe direkt darauf ein."}`
  )

  // ── Mission Completion Marker ────────────────────────────────────────────
  // Embed the evaluation directly in the main LLM response so no second call
  // is needed. The marker is parsed after response generation.
  if (input.agentGoal) {
    parts.push(
      `## Missions-Status\n` +
      `Beende deine Antwort mit einem Missions-Status-Marker auf einer eigenen Zeile:\n` +
      `- \`[MISSION_COMPLETED]\` wenn deine Mission (siehe "Dein Ziel in diesem State") vollständig erfüllt ist.\n` +
      `- \`[MISSION_IN_PROGRESS]\` wenn du noch in Bearbeitung bist oder auf eine Lead-Antwort wartest.\n\n` +
      `Richte dich nach den gleichen Kriterien wie für \`handoff_proposed\`. Der Marker ersetzt NICHT den Tool-Aufruf, dient aber als zusätzliches Signal.`,
    )
  }

  const lang = input.language ?? input.brain.language ?? "de"
  parts.push(buildLanguageEnforcement(lang))

  return parts.join("\n\n")
}
