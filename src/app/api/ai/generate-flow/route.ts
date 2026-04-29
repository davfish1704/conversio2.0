import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { generateFlowStates } from "@/lib/ai/groq-client"

interface GeneratedState {
  name: string
  type: string
  mission: string
  rules: string
  orderIndex: number
  config: any
}

function validateStates(states: any[]): GeneratedState[] {
  return states.map((s, i) => ({
    name: typeof s.name === "string" ? s.name : `State ${i + 1}`,
    type: ["AI", "MESSAGE", "TEMPLATE", "CONDITION", "WAIT"].includes(s.type?.toUpperCase()) ? s.type.toUpperCase() : "MESSAGE",
    mission: typeof s.mission === "string" ? s.mission : (typeof s.message === "string" ? s.message : ""),
    rules: typeof s.rules === "string" ? s.rules : (typeof s.nextState === "string" ? `Next: ${s.nextState}` : ""),
    orderIndex: typeof s.orderIndex === "number" ? s.orderIndex : i,
    config: s.config && typeof s.config === "object" ? s.config : {},
  }))
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

    const content = await generateFlowStates(prompt)

    if (!content) {
      return NextResponse.json(
        { error: "Empty response from AI model" },
        { status: 500 }
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
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
