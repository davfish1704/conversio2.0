import type { Tool } from "@/lib/tools/registry"

export const escalateToSupervisorTool: Tool = {
  name: "escalate_to_supervisor",
  description:
    "Ruf dieses Tool auf, wenn die Situation deine Fähigkeiten übersteigt und menschliches Eingreifen oder Supervisor-Analyse erforderlich ist. Zum Beispiel: widersprüchliche Anforderungen, technische Fehler, unklare Aufgabe, oder Anfragen die außerhalb deines Aufgabenbereichs liegen.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Warum eine Eskalation notwendig ist",
      },
      urgency: {
        type: "string",
        enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
        description: "Dringlichkeit der Eskalation",
      },
    },
    required: ["reason"],
  },
  async execute(_args) {
    // Signal-only tool — outcome "ESCALATED" is set in sub-agent-runtime after tool loop
    return {
      success:    true,
      data:       { acknowledged: true, message: "Eskalation wird verarbeitet." },
      nextAction: "escalate",
    }
  },
}
