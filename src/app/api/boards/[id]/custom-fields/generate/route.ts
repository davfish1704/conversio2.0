import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"
import type { QualificationField } from "@/lib/types"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const states = await prisma.state.findMany({
    where: { boardId: params.id, isActive: true, type: "AI" },
    select: { id: true, name: true, agentGoal: true },
  })

  const stateDescriptions = states
    .filter((s) => s.agentGoal)
    .map((s) => `State ID: ${s.id}\nState Name: ${s.name}\nGoal: ${s.agentGoal}`)
    .join("\n\n")

  if (!stateDescriptions) return NextResponse.json({ fields: [] })

  const response = await aiRegistry.execute({
    boardId: params.id,
    purpose: "extraction",
    messages: [
      {
        role: "system",
        content:
          "You extract structured qualification field definitions from chatbot state goals. Return ONLY a valid JSON array, no markdown.",
      },
      {
        role: "user",
        content:
          `Given these chatbot states and their goals:\n\n${stateDescriptions}\n\n` +
          `List all data fields the bot needs to collect from leads. ` +
          `For each field, set stateKeys to the array of State IDs that collect that field. ` +
          `Return JSON array with this exact shape (max 20 fields):\n` +
          `[{\n` +
          `  "key": "camelCaseKey",\n` +
          `  "label": "Deutsches Label",\n` +
          `  "type": "text|number|enum|boolean|date|phone|email",\n` +
          `  "options": ["Option1", "Option2"],\n` +
          `  "required": true,\n` +
          `  "order": 1,\n` +
          `  "unit": "EUR",\n` +
          `  "stateKeys": ["<stateId1>", "<stateId2>"]\n` +
          `}]\n` +
          `Include "options" only for type "enum". Include "unit" only for number fields. ` +
          `"stateKeys" is required for every field — use [] if it applies to all states.`,
      },
    ],
    temperature: 0.2,
    maxTokens: 1500,
  })

  try {
    const raw = response.content.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const parsed: unknown[] = JSON.parse(raw)
    if (!Array.isArray(parsed)) return NextResponse.json({ fields: [] })

    const validTypes = ["text", "number", "enum", "boolean", "date", "phone", "email"] as const

    const fields: QualificationField[] = parsed
      .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
      .map((f, i) => ({
        id: randomUUID(),
        key: typeof f.key === "string" ? f.key : `field_${i}`,
        label: typeof f.label === "string" ? f.label : `Feld ${i + 1}`,
        type: validTypes.includes(f.type as never) ? (f.type as QualificationField["type"]) : "text",
        options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
        required: f.required === true,
        order: typeof f.order === "number" ? f.order : i,
        unit: typeof f.unit === "string" && f.unit ? f.unit : undefined,
        stateKeys: Array.isArray(f.stateKeys) ? (f.stateKeys as string[]) : [],
      }))

    return NextResponse.json({ fields })
  } catch {
    return NextResponse.json({ fields: [] })
  }
}
