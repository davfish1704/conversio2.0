import { aiRegistry } from "@/lib/ai/registry"

export interface MissionEvalInput {
  agentGoal: string
  stateName: string
  recentMessages: { direction: string; content: string }[]
  leadData: Record<string, unknown>
  conversationSummary: string | null
  language: string
  boardId: string
}

export interface MissionEvalResult {
  completed: boolean
  reason: string
  confidence: number
}

export async function evaluateMissionCompletion(
  input: MissionEvalInput,
): Promise<MissionEvalResult> {
  const transcript = input.recentMessages
    .slice(-6)
    .map((m) => (m.direction === "INBOUND" ? `Lead: ${m.content}` : `Du: ${m.content}`))
    .join("\n")

  const leadInfo = Object.entries(input.leadData)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")

  const summary = input.conversationSummary
    ? `Zusammenfassung: ${input.conversationSummary}`
    : ""

  const systemPrompt = `Du evaluierst ob ein AI-Assistent seine Mission in einem State abgeschlossen hat.

## State
${input.stateName}

## Mission des AI-Assistenten
${input.agentGoal}

## Lead-Informationen
${leadInfo || "Keine"}

${summary}

## Letzter Gesprächsverlauf
${transcript}

## Aufgabe
Hat der AI-Assistent seine Mission in diesem State bereits abgeschlossen?

Überlege:
- Wurde die Mission vollständig erfüllt?
- Wurde dem Lead geholfen?
- Gibt es noch offene Fragen oder Aktionen?
- Ist der Lead bereit für den nächsten Schritt?

Antworte NUR mit einem JSON-Objekt:
{
  "completed": true/false,
  "reason": "Kurze Begründung auf Deutsch",
  "confidence": 0.0-1.0
}`

  try {
    const response = await aiRegistry.execute({
      boardId: input.boardId,
      purpose: "classification",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Evaluierung der Mission." },
      ],
      temperature: 0.1,
      maxTokens: 200,
    })

    const raw = response.content?.trim() ?? "{}"
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? "{}") as Partial<MissionEvalResult>

    const result: MissionEvalResult = {
      completed: parsed.completed === true,
      reason: parsed.reason ?? "Keine Begründung",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    }

    console.log(
      `[MissionEvaluator] state="${input.stateName}" goal="${input.agentGoal.slice(0, 60)}" ` +
      `completed=${result.completed} confidence=${result.confidence} reason="${result.reason}"`,
    )

    return result
  } catch (err) {
    console.error("[MissionEvaluator] Fehler:", err)
    return { completed: false, reason: "Evaluierung fehlgeschlagen", confidence: 0 }
  }
}
