import type { BoardTemplate } from "./types"

export const insuranceTemplate: BoardTemplate = {
  name: "Versicherungsmakler Pipeline",
  description: "Qualifizierung und Terminbuchung für Versicherungsanfragen",
  industry: "insurance",
  states: [
    {
      name: "Erstqualifizierung",
      type: "AI",
      orderIndex: 0,
      agentRole: "Du bist ein freundlicher Versicherungsberater-Assistent für eine deutschsprachige Versicherungsmakler-Kanzlei.",
      agentGoal: "Ermittle, ob der Lead eine konkrete Versicherungsanfrage hat und welche Art von Versicherung ihn interessiert (KFZ, Haftpflicht, Leben, BU, Hausrat, etc.).",
      agentSystemPrompt: `Begrüße den Lead herzlich und finde heraus:
1. Welche Versicherungsart interessiert ihn?
2. Hat er bereits eine bestehende Versicherung, die er wechseln möchte, oder sucht er eine neue?
3. Was ist der Anlass der Anfrage (Preisvergleich, Schadensfall, Neukunde)?

Sei dabei kurz und direkt. Stelle maximal eine Frage auf einmal. Nutze das Tool update_lead_data, sobald du relevante Informationen erhältst.`,
      handoffMode: "HYBRID",
      handoffRules: [
        { type: "field_collected", field: "insurance_type", operator: "exists" },
        { type: "message_count", operator: "gte", value: 2 },
      ],
      minAgentConfidence: 0.75,
      availableTools: ["update_lead_data", "advance_state", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["insurance_type", "insurance_reason"],
      nextStateName: "Datenerfassung",
      escalateOnNoReply: 24,
    },
    {
      name: "Datenerfassung",
      type: "AI",
      orderIndex: 1,
      agentRole: "Du bist ein präziser Datenschreiber für Versicherungsanfragen. Deine Aufgabe ist ausschließlich das Erfassen von Kundendaten.",
      agentGoal: "Erfasse vollständige Kontakt- und Versicherungsdaten für die Angebotserstellung.",
      agentSystemPrompt: `Erfasse systematisch folgende Pflichtdaten:
1. Vollständiger Name
2. Geburtsdatum
3. PLZ / Wohnort
4. Telefonnummer (falls nicht bekannt)
5. Gewünschte Versicherungsart und Umfang

Bestätige jeden erhaltenen Wert kurz und frage dann nach dem nächsten fehlenden Feld. Nutze update_lead_data nach jeder Information.`,
      handoffMode: "RULE_ONLY",
      handoffRules: [
        { type: "field_collected", field: "full_name", operator: "exists" },
        { type: "field_collected", field: "birth_date", operator: "exists" },
        { type: "field_collected", field: "zip_code", operator: "exists" },
      ],
      minAgentConfidence: 0.8,
      availableTools: ["update_lead_data", "advance_state", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["full_name", "birth_date", "zip_code", "phone"],
      nextStateName: "Terminvereinbarung",
      escalateOnNoReply: 48,
    },
    {
      name: "Terminvereinbarung",
      type: "AI",
      orderIndex: 2,
      agentRole: "Du bist ein freundlicher Terminkoordinator einer Versicherungskanzlei.",
      agentGoal: "Vereinbare einen konkreten Beratungstermin (Datum, Uhrzeit, Format: Telefon oder persönlich).",
      agentSystemPrompt: `Biete dem Lead zwei konkrete Terminoptionen für ein Beratungsgespräch an (z.B. Dienstag 14 Uhr oder Donnerstag 10 Uhr).

Wenn der Lead einen Termin bestätigt:
1. Speichere Datum, Uhrzeit und Format mit update_lead_data
2. Bestätige den Termin schriftlich
3. Erkläre, dass ein Kollege ihn zum vereinbarten Termin kontaktieren wird
4. Rufe handoff_proposed auf

Wenn der Lead keinen Termin möchte oder eskaliert, nutze escalate_to_human.`,
      handoffMode: "HYBRID",
      handoffRules: [
        { type: "field_collected", field: "appointment_date", operator: "exists" },
      ],
      minAgentConfidence: 0.85,
      availableTools: ["update_lead_data", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["appointment_date", "appointment_format"],
      nextStateName: "Termin bestätigt",
      escalateOnNoReply: 72,
    },
    {
      name: "Termin bestätigt",
      type: "WAIT",
      orderIndex: 3,
    },
  ],
}
