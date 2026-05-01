import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

/**
 * POST /api/boards/[id]/leads
 * Legt direkt einen Lead an + leere Conversation für Messaging-Bereitschaft
 * Body: { name, phone?, email?, tags?, source?, channel?: "whatsapp"|"telegram"|"manual" }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return jsonError("Please sign in.", "UNAUTHORIZED", 401)

  const membership = await prisma.boardMember.findFirst({
    where: { boardId: params.id, userId: session.user.id, role: { in: ["ADMIN", "AGENT"] } },
  })
  if (!membership) return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)

  const body = await req.json()
  const { name, phone, email, tags, source = "manual", channel = "manual" } = body

  if (channel === "whatsapp" && !phone) {
    return jsonError("Telefonnummer ist erforderlich für WhatsApp.", "INVALID_INPUT", 400)
  }

  const board = await prisma.board.findUnique({ where: { id: params.id }, select: { teamId: true } })
  if (!board) return jsonError("Board not found.", "BOARD_NOT_FOUND", 404)

  const normalizedPhone = phone ? (phone.startsWith("+") ? phone : `+${phone}`) : null

  const firstState = await prisma.state.findFirst({
    where: { boardId: params.id },
    orderBy: { orderIndex: "asc" },
  })

  // Dedup: existierender Lead mit gleicher Phone+BoardId
  if (normalizedPhone) {
    const existingLead = await (prisma as any).lead.findFirst({
      where: { boardId: params.id, phone: normalizedPhone },
    })
    if (existingLead) {
      if (!existingLead.currentStateId && firstState) {
        await (prisma as any).lead.update({
          where: { id: existingLead.id },
          data: { name: name || existingLead.name, currentStateId: firstState.id },
        })
      }
      return NextResponse.json({ success: true, lead: existingLead, message: "Lead already exists" }, { status: 200 })
    }
  }

  const lead = await (prisma as any).lead.create({
    data: {
      boardId: params.id,
      name: name || normalizedPhone || "Neuer Lead",
      phone: normalizedPhone,
      email: email || null,
      source,
      channel,
      tags: tags || [],
      currentStateId: firstState?.id || null,
      customData: email ? { email } : {},
    },
  })

  // Leere Conversation anlegen für Messaging-Bereitschaft
  await (prisma as any).conversation.create({
    data: {
      leadId: lead.id,
      boardId: params.id,
      channel,
      status: "ACTIVE",
      externalId: null,
    },
  })

  return NextResponse.json({ success: true, lead }, { status: 201 })
}
