import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { groqChat } from "@/lib/ai/groq-client"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const states = await prisma.state.findMany({
    where: { boardId: params.id, isActive: true, type: "AI" },
    select: { name: true, mission: true, dataToCollect: true },
  })
  const missions = states.map(s => s.mission || "").filter(Boolean).join("\n\n")
  if (!missions) return NextResponse.json({ fields: [] })

  const result = await groqChat([
    { role: "system", content: "You extract data field definitions from sales/chat bot missions. Return ONLY valid JSON array, no markdown." },
    { role: "user", content: `Given these bot state missions:\n\n${missions}\n\nList the data fields the bot needs to collect. Return JSON array: [{"key": "camelCase", "label": "German Label", "type": "text|number|date|select|multiselect|boolean|phone|email", "required": true|false}]. Max 20 fields.` },
  ], "llama-3.1-8b-instant", 0.3, 1000)

  try {
    const raw = result.content.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "")
    const fields = JSON.parse(raw)
    return NextResponse.json({ fields: Array.isArray(fields) ? fields : [] })
  } catch {
    return NextResponse.json({ fields: [] })
  }
}
