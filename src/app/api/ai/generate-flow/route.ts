import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { aiRegistry } from "@/lib/ai/registry"
import type { QualificationField } from "@/lib/types"

export interface GeneratedState {
  name: string
  type: string
  rules: string
  orderIndex: number
  config: Record<string, unknown>
  agentRole?: string
  agentGoal?: string
  agentSystemPrompt?: string
}

const VALID_TYPES = ["AI", "MESSAGE", "TEMPLATE", "CONDITION", "WAIT"] as const

function extractJson(text: string): string {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  const match = stripped.match(/[\[{][\s\S]*[\]}]/)
  if (!match) throw new Error("No JSON found in response")
  return match[0]
}

function normalizeType(raw: unknown, hasAgentContent: boolean): string {
  const upper = typeof raw === "string" ? raw.toUpperCase() : ""
  if (VALID_TYPES.includes(upper as never)) return upper
  // Default to AI instead of MESSAGE when agent content is present —
  // this was the root cause of all generated states landing as MESSAGE.
  return hasAgentContent ? "AI" : "MESSAGE"
}

function validateStates(states: unknown[]): GeneratedState[] {
  return states
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s, i) => {
      const agentRole = typeof s.agentRole === "string" && s.agentRole ? s.agentRole : undefined
      const agentGoal =
        typeof s.agentGoal === "string" && s.agentGoal
          ? s.agentGoal
          : typeof s.mission === "string" && s.mission
            ? s.mission
            : undefined
      const agentSystemPrompt =
        typeof s.agentSystemPrompt === "string" && s.agentSystemPrompt
          ? s.agentSystemPrompt
          : undefined

      return {
        name: typeof s.name === "string" ? s.name : `State ${i + 1}`,
        type: normalizeType(s.type, !!(agentRole || agentGoal || agentSystemPrompt)),
        rules: typeof s.rules === "string" ? s.rules : "",
        orderIndex: typeof s.orderIndex === "number" ? s.orderIndex : i,
        config:
          s.config && typeof s.config === "object" && !Array.isArray(s.config)
            ? (s.config as Record<string, unknown>)
            : {},
        agentRole,
        agentGoal,
        agentSystemPrompt,
      }
    })
}

function validateQualificationFields(raw: unknown): QualificationField[] {
  if (!Array.isArray(raw)) return []
  const validTypes = ["text", "number", "enum", "boolean", "date", "phone", "email"]
  return raw
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f, i) => ({
      id: crypto.randomUUID(),
      key: typeof f.key === "string" ? f.key : `field_${i}`,
      label: typeof f.label === "string" ? f.label : `Feld ${i + 1}`,
      type: validTypes.includes(f.type as string)
        ? (f.type as QualificationField["type"])
        : "text",
      options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
      required: f.required === true,
      order: typeof f.order === "number" ? f.order : i,
      unit: typeof f.unit === "string" && f.unit ? f.unit : undefined,
      stateKeys: [],
    }))
}

const SYSTEM_PROMPT = `You are a flow builder assistant for a conversational AI CRM system (chatbot pipeline for insurance brokers and sales teams).

Generate a JSON object with two keys:
- "states": array of conversation states
- "qualificationFields": array of data fields to collect (ONLY include when the flow implies lead qualification)

STATES — RULES:
- Use type "AI" for ALL conversational or data-collection steps. Use "MESSAGE" ONLY for one-way broadcasts with no expected reply (e.g. a confirmation text after closing).
- For EVERY AI state you MUST provide: agentRole, agentGoal, and agentSystemPrompt.
- agentSystemPrompt must be GENERIC and SCHEMA-DRIVEN: do NOT hardcode specific field names. Instead instruct the agent to look at its Qualification-Slots section (injected at runtime by the system) and call update_qualification for each value the lead provides.
- States are auto-linked in sequence after creation.

State JSON shape:
{
  "name": "German concise state name",
  "type": "AI",
  "orderIndex": 0,
  "rules": "",
  "config": {},
  "agentRole": "Who the agent IS in this state — one sentence",
  "agentGoal": "What the agent must achieve — one sentence",
  "agentSystemPrompt": "Detailed generic instructions. Never hardcode field names. Refer agent to Qualification-Slots section."
}

QUALIFICATION FIELDS (optional — only when flow implies data collection):
{
  "key": "camelCaseKey",
  "label": "Deutsches Label",
  "type": "text|number|enum|boolean|date",
  "options": ["Option1", "Option2"],
  "required": true,
  "order": 0,
  "unit": "EUR"
}

Respond ONLY with valid JSON. No markdown. No explanation outside the JSON.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { prompt } = await req.json()
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json({ error: "Prompt must be at least 5 characters" }, { status: 400 })
    }

    const response = await aiRegistry.execute({
      boardId: "global",
      purpose: "main",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt.trim() },
      ],
    })

    const content = response.content
    if (!content) {
      return NextResponse.json({ error: "Empty response from AI model" }, { status: 500 })
    }

    let cleaned: string
    try {
      cleaned = extractJson(content)
    } catch {
      console.error("[generate-flow] Raw AI response:", content)
      return NextResponse.json(
        { error: "AI response did not contain valid JSON. Please try again." },
        { status: 422 },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error("[generate-flow] Parse error:", e, "cleaned:", cleaned)
      return NextResponse.json(
        { error: "AI response was not valid JSON. Please describe the flow in more detail." },
        { status: 422 },
      )
    }

    // Accept both a bare array and { states: [...], qualificationFields: [...] }
    const isObj = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    const statesRaw: unknown = isObj ? (parsed as Record<string, unknown>).states : parsed
    const qualRaw: unknown = isObj
      ? (parsed as Record<string, unknown>).qualificationFields
      : undefined

    if (!Array.isArray(statesRaw) || statesRaw.length === 0) {
      return NextResponse.json(
        { error: "AI response did not contain states. Please try again." },
        { status: 422 },
      )
    }

    const states = validateStates(statesRaw)
    const qualificationFields = validateQualificationFields(qualRaw)

    return NextResponse.json({
      states,
      ...(qualificationFields.length > 0 ? { qualificationFields } : {}),
    })
  } catch (error) {
    console.error("AI Flow Generation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Flow generation failed" },
      { status: 500 },
    )
  }
}
