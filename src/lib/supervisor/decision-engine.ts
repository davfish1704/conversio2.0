import { aiRegistry } from "@/lib/ai/registry"
import { parseJSON } from "@/lib/ai/json/parser"
import type { SupervisorDecision } from "./types"
import type { SupervisorTriggerType, AgentRunOutcome } from "@prisma/client"

const VALID_ACTIONS = [
  "RESET_STATE",
  "REASSIGN_TO_STATE",
  "PAUSE_LEAD",
  "RESUME_LEAD",
  "FORCE_HANDOFF",
  "NOTIFY_ONLY",
  "KILL_CONVERSATION",
  "UPDATE_LEAD_SCORE",
  "REQUEST_HUMAN_TAKEOVER",
] as const

const VALID_URGENCIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const

const SYSTEM_PROMPT = `Du bist ein Supervisor-Agent für ein KI-CRM-System namens Conversio.

Deine Aufgabe: Analysiere fehlerhafte oder steckengebliebene Conversations und entscheide, welche Korrektur-Aktion notwendig ist.

Verfügbare Aktionen:
- NOTIFY_ONLY        — Nur Benachrichtigung, keine Zustandsänderung
- RESET_STATE        — State zurücksetzen (re-entry)
- REASSIGN_TO_STATE  — Anderen State zuweisen (actionParams.targetStateId erforderlich)
- PAUSE_LEAD         — Lead pausieren (Conversation einfrieren)
- RESUME_LEAD        — Lead fortsetzen
- FORCE_HANDOFF      — Handoff erzwingen, ignoriert Regeln
- KILL_CONVERSATION  — Conversation archivieren
- UPDATE_LEAD_SCORE  — Lead Score anpassen (actionParams.delta: number)
- REQUEST_HUMAN_TAKEOVER — Manuelles Eingreifen anfordern

Dringlichkeitsstufen: LOW | NORMAL | HIGH | CRITICAL

Antworte NUR mit validem JSON, ohne Markdown oder Erklärungen:
{
  "proposedAction": "<AKTION>",
  "actionParams": {},
  "reasoning": "<Kurze Begründung auf Deutsch>",
  "urgency": "<DRINGLICHKEIT>"
}`

interface DecisionContext {
  boardId:        string
  triggerType:    SupervisorTriggerType
  triggerContext: Record<string, unknown>
  recentOutcomes: AgentRunOutcome[]
  conversationId: string
}

export async function decideSupervisorAction(ctx: DecisionContext): Promise<SupervisorDecision> {
  const userPrompt = [
    `Trigger: ${ctx.triggerType}`,
    `Conversation: ${ctx.conversationId}`,
    `Board: ${ctx.boardId}`,
    `Kontext: ${JSON.stringify(ctx.triggerContext)}`,
    `Letzte Outcomes (${ctx.recentOutcomes.length}): ${ctx.recentOutcomes.join(", ")}`,
  ].join("\n")

  try {
    const response = await aiRegistry.execute({
      boardId:     ctx.boardId,
      purpose:     "classification",
      messages:    [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
      temperature: 0,
      maxTokens:   400,
    })

    const parsed = parseJSON<SupervisorDecision>(response.content ?? "{}")

    if (
      parsed.success &&
      parsed.data &&
      VALID_ACTIONS.includes(parsed.data.proposedAction as typeof VALID_ACTIONS[number]) &&
      VALID_URGENCIES.includes(parsed.data.urgency as typeof VALID_URGENCIES[number])
    ) {
      return {
        proposedAction: parsed.data.proposedAction,
        actionParams:   parsed.data.actionParams ?? {},
        reasoning:      parsed.data.reasoning ?? "Kein Begründungstext",
        urgency:        parsed.data.urgency,
      }
    }
  } catch (err) {
    console.error("[SupervisorDecisionEngine] LLM-Fehler:", err)
  }

  // Fallback
  return {
    proposedAction: "NOTIFY_ONLY",
    actionParams:   {},
    reasoning:      `Fallback: LLM nicht verfügbar. Trigger: ${ctx.triggerType}`,
    urgency:        "NORMAL",
  }
}
