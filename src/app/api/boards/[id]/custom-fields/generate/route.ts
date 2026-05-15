import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const states = await prisma.state.findMany({
    where: { boardId: params.id, isActive: true, type: "AI" },
    select: { name: true, agentGoal: true, dataToCollect: true },
  })
  const missions = states.map(s => s.agentGoal || "").filter(Boolean).join("\n\n")
  if (!missions) return NextResponse.json({ fields: [] })

  const response = await aiRegistry.execute({
    boardId: params.id,
    purpose: "extraction",
    messages: [
      { role: "system", content: "You extract data field definitions from sales/chat bot missions. Return ONLY valid JSON array, no markdown." },
      { role: "user", content: `Given these bot state missions:\n\n${missions}\n\nList the data fields the bot needs to collect. Return JSON array: [{"key": "camelCase", "label": "German Label", "type": "text|number|date|select|multiselect|boolean|phone|email", "required": true|false}]. Max 20 fields.` },
    ],
    temperature: 0.3,
    maxTokens: 1000,
  })

  try {
    const raw = response.content.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const fields = JSON.parse(raw)
    return NextResponse.json({ fields: Array.isArray(fields) ? fields : [] })
  } catch {
    return NextResponse.json({ fields: [] })
  }
}
