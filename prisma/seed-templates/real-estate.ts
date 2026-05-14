import type { BoardTemplate } from "./types"

export const realEstateTemplate: BoardTemplate = {
  name: "Immobilienmakler Pipeline",
  description: "Lead-Qualifizierung für Kauf- und Mietinteressenten sowie Eigentümer",
  industry: "real-estate",
  states: [
    {
      name: "Erster Kontakt",
      type: "AI",
      orderIndex: 0,
      agentRole: "Du bist ein professioneller Assistent eines Immobilienmaklers im deutschsprachigen Raum.",
      agentGoal: "Ermittle, ob der Lead Käufer, Mieter oder Eigentümer (Verkauf/Vermietung) ist, und sein ungefähres Suchprofil.",
      agentSystemPrompt: `Begrüße den Lead und stelle genau eine Qualifizierungsfrage:
- Sucht er eine Immobilie zum Kauf oder zur Miete?
- Oder möchte er eine Immobilie verkaufen oder vermieten?

Nutze update_lead_data sobald du den Lead-Typ kennst (Wert: "buyer", "renter", "seller" oder "landlord").
Frage anschließend nach dem Suchgebiet und dem Budget.`,
      handoffMode: "HYBRID",
      handoffRules: [
        { type: "field_collected", field: "lead_type", operator: "exists" },
        { type: "message_count", operator: "gte", value: 2 },
      ],
      minAgentConfidence: 0.7,
      availableTools: ["update_lead_data", "advance_state", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["lead_type", "search_area"],
      nextStateName: "Profilaufnahme",
      escalateOnNoReply: 24,
    },
    {
      name: "Profilaufnahme",
      type: "AI",
      orderIndex: 1,
      agentRole: "Du bist ein erfahrener Immobilienberater, der präzise Suchprofile aufnimmt.",
      agentGoal: "Vervollständige das Suchprofil: Lage, Größe, Budget, Zeitrahmen, Besonderheiten.",
      agentSystemPrompt: `Erfasse das vollständige Suchprofil. Frage systematisch nach:
1. Gewünschte Lage / Region / Stadtteile
2. Wohnfläche (m²) und Zimmeranzahl
3. Budget (Kaufpreis oder monatliche Miete)
4. Gewünschter Einzug / Zeithorizont
5. Besondere Anforderungen (Garage, Garten, barrierefrei, etc.)

Stelle immer nur eine Frage. Bestätige erhaltene Angaben kurz. Nutze update_lead_data für jeden Wert.
Wenn alle Pflichtfelder erfasst sind, schlage den Handoff vor.`,
      handoffMode: "RULE_ONLY",
      handoffRules: [
        { type: "field_collected", field: "budget", operator: "exists" },
        { type: "field_collected", field: "desired_size", operator: "exists" },
        { type: "field_collected", field: "desired_location", operator: "exists" },
      ],
      minAgentConfidence: 0.8,
      availableTools: ["update_lead_data", "advance_state", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["budget", "desired_size", "desired_location", "desired_rooms", "move_in_date"],
      nextStateName: "Exposé-Versand",
      escalateOnNoReply: 48,
    },
    {
      name: "Exposé-Versand",
      type: "AI",
      orderIndex: 2,
      agentRole: "Du bist ein aufmerksamer Immobilienmakler-Assistent, der passende Objekte präsentiert.",
      agentGoal: "Informiere den Lead, dass passende Exposés vorbereitet werden, und vereinbare einen Besichtigungstermin.",
      agentSystemPrompt: `Informiere den Lead, dass du sein Profil an den zuständigen Makler weitergegeben hast und passende Objekte vorbereitet werden.

Biete gleichzeitig an, direkt einen Besichtigungstermin vorzumerken, sobald ein passendes Objekt identifiziert wurde.
Frage, welche Wochentage und Tageszeiten für Besichtigungen infrage kommen.
Speichere diese Präferenzen mit update_lead_data.

Rufe danach handoff_proposed auf.`,
      handoffMode: "LLM_ONLY",
      minAgentConfidence: 0.7,
      availableTools: ["update_lead_data", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["viewing_availability"],
      nextStateName: "In Bearbeitung",
    },
    {
      name: "In Bearbeitung",
      type: "WAIT",
      orderIndex: 3,
      mission: "Profil komplett. Makler prüft Objektmatch und kontaktiert Lead persönlich.",
    },
  ],
}
