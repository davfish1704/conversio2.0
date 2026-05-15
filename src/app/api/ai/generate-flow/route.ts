import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { aiRegistry } from "@/lib/ai/registry"
import { normalizeState } from "@/lib/state-utils"

interface GeneratedState {
  name: string
  type: string
  rules: string
  orderIndex: number
  config: any
  agentGoal?: string
}

function extractJson(text: string): string {
  const withoutFences = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()

  const match = withoutFences.match(/[\[{][\s\S]*[\]}]/)
  if (!match) {
    throw new Error("No JSON found in response")
  }

  return match[0]
}

function validateStates(states: any[]): GeneratedState[] {
  return states.map((s, i) => {
    const normalized = normalizeState(s)
    return {
      name: typeof s.name === "string" ? s.name : `State ${i + 1}`,
      type: ["AI", "MESSAGE", "TEMPLATE", "CONDITION", "WAIT"].includes(s.type?.toUpperCase()) ? s.type.toUpperCase() : "MESSAGE",
      rules: typeof s.rules === "string" ? s.rules : "",
      orderIndex: typeof s.orderIndex === "number" ? s.orderIndex : i,
      config: s.config && typeof s.config === "object" ? s.config : {},
      agentGoal: normalized.agentGoal ?? undefined,
    }
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Prompt must be at least 5 characters" },
        { status: 400 }
      )
    }

    const response = await aiRegistry.execute({
      boardId: "global",
      purpose: "main",
      messages: [
        { role: "system", content: "You are a flow builder assistant. Respond ONLY with valid JSON array of states. No markdown." },
        { role: "user", content: prompt.trim() },
      ],
    })

    const content = response.content
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from AI model" },
        { status: 500 }
      )
    }

    let cleaned: string
    try {
      cleaned = extractJson(content)
    } catch {
      console.error("[generate-flow] Raw AI response:", content)
      return NextResponse.json(
        { error: "AI response did not contain valid JSON. Please try again." },
        { status: 422 }
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error("[generate-flow] Raw AI response:", content)
      console.error("[generate-flow] Cleaned response:", cleaned)
      console.error("[generate-flow] Parse error:", e)
      return NextResponse.json(
        { error: "AI response was not valid JSON. Please describe the flow in more detail." },
        { status: 422 }
      )
    }

    const statesArray = Array.isArray(parsed) ? parsed : parsed.states

    if (!Array.isArray(statesArray)) {
      return NextResponse.json(
        { error: "AI response did not contain states. Please try again." },
        { status: 422 }
      )
    }

    const states = validateStates(statesArray)

    return NextResponse.json({ states })
  } catch (error) {
    console.error("AI Flow Generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Flow generation failed" },
      { status: 500 }
    )
  }
}
