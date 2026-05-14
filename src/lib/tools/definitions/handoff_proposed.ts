import type { Tool } from "@/lib/tools/registry"

export const handoffProposedTool: Tool = {
  name: "handoff_proposed",
  description:
    "Ruf dieses Tool auf, wenn du glaubst, dass deine Aufgabe in diesem State abgeschlossen ist und der Lead zum nächsten State übergehen soll. Das System validiert deinen Vorschlag anhand der konfigurierten Handoff-Regeln.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Warum du glaubst, dass deine Aufgabe erledigt ist",
      },
      confidence: {
        type: "number",
        description: "Deine Konfidenz (0.0 bis 1.0)",
      },
      suggestedTargetStateId: {
        type: "string",
        description: "Optional: ID des States der übernehmen soll",
      },
    },
    required: ["reason", "confidence"],
  },
  async execute() {
    // Signal-only tool — actual transition logic runs after the tool loop in sub-agent-runtime
    return {
      success: true,
      data: { acknowledged: true, message: "Handoff-Vorschlag wurde registriert und wird geprüft." },
      nextAction: "continue",
    }
  },
}
