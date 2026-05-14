import type { BoardTemplate } from "./types"

export const genericFunnelTemplate: BoardTemplate = {
  name: "Generischer Lead-Funnel",
  description: "Universelle 3-Stufen-Pipeline für Erstqualifizierung, Bedarfsermittlung und Abschluss",
  industry: "generic",
  states: [
    {
      name: "Begrüßung & Qualifizierung",
      type: "AI",
      orderIndex: 0,
      agentRole: "Du bist ein freundlicher, professioneller Kundenberater.",
      agentGoal: "Begrüße den Lead und ermittle sein konkretes Anliegen sowie seine Kontaktdaten.",
      agentSystemPrompt: `Begrüße den Lead herzlich und finde heraus:
1. Was ist sein konkretes Anliegen oder Problem?
2. Wie dringend ist es?
3. Wie ist sein vollständiger Name?

Stelle maximal eine Frage auf einmal. Nutze update_lead_data für erhaltene Informationen.
Wenn du Name und Anliegen erfasst hast, schlage den Handoff vor.`,
      handoffMode: "HYBRID",
      handoffRules: [
        { type: "field_collected", field: "full_name", operator: "exists" },
        { type: "field_collected", field: "inquiry_topic", operator: "exists" },
      ],
      minAgentConfidence: 0.7,
      availableTools: ["update_lead_data", "advance_state", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["full_name", "inquiry_topic", "urgency"],
      nextStateName: "Bedarfsermittlung",
      escalateOnNoReply: 24,
    },
    {
      name: "Bedarfsermittlung",
      type: "AI",
      orderIndex: 1,
      agentRole: "Du bist ein erfahrener Berater, der den konkreten Bedarf eines Kunden versteht.",
      agentGoal: "Vertiefe das Verständnis des Bedarfs und qualifiziere den Lead (Budget, Zeitrahmen, Entscheidungsträger).",
      agentSystemPrompt: `Vertiefe das Gespräch mit gezielten Fragen:
1. Was ist das konkrete Ziel oder Problem?
2. Welches Budget steht zur Verfügung?
3. Wann soll eine Lösung vorliegen?
4. Wer trifft die finale Entscheidung?

Bleibe konversationell. Stelle eine Frage auf einmal.
Nutze update_lead_data für alle erfassten Werte.
Wenn Budget und Zeitrahmen bekannt sind, schlage den Handoff vor.`,
      handoffMode: "HYBRID",
      handoffRules: [
        { type: "field_collected", field: "budget", operator: "exists" },
        { type: "field_collected", field: "timeline", operator: "exists" },
        { type: "lead_score", operator: "gte", value: 20 },
      ],
      minAgentConfidence: 0.75,
      availableTools: ["update_lead_data", "set_lead_score", "advance_state", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["budget", "timeline", "decision_maker"],
      nextStateName: "Angebotsphase",
      escalateOnNoReply: 48,
    },
    {
      name: "Angebotsphase",
      type: "AI",
      orderIndex: 2,
      agentRole: "Du bist ein lösungsorientierter Berater, der passende Angebote präsentiert.",
      agentGoal: "Präsentiere das Angebot, beantworte Rückfragen und führe den Lead zur Terminvereinbarung oder Entscheidung.",
      agentSystemPrompt: `Informiere den Lead, dass ein passendes Angebot für ihn vorbereitet wird.
Biete an, die Details in einem kurzen Telefonat oder Video-Call zu besprechen.
Frage nach verfügbaren Terminen.
Speichere den Wunschtermin mit update_lead_data.
Rufe danach handoff_proposed auf.`,
      handoffMode: "LLM_ONLY",
      minAgentConfidence: 0.7,
      availableTools: ["update_lead_data", "escalate_to_human", "handoff_proposed"],
      dataToCollect: ["preferred_meeting_time"],
      nextStateName: "Abschluss",
    },
    {
      name: "Abschluss",
      type: "WAIT",
      orderIndex: 3,
      mission: "Lead ist vollständig qualifiziert. Übergabe an Vertrieb für manuellen Abschluss.",
    },
  ],
}
