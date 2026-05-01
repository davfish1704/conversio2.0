import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

/**
 * POST /api/boards/[id]/leads
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

  // Phone required only for WhatsApp
  if (channel === "whatsapp" && !phone) {
    return jsonError("Telefonnummer ist erforderlich für WhatsApp.", "INVALID_INPUT", 400)
  }

  const board = await prisma.board.findUnique({
    where: { id: params.id },
    select: { teamId: true },
  })
  if (!board) return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)

  const normalizedPhone = phone ? (phone.startsWith("+") ? phone : `+${phone}`) : null

  // For WhatsApp leads, we need a bridge waAccountId (legacy FK) — find the board's WA channel
  let waAccountId: string | undefined
  if (channel === "whatsapp") {
    // Use existing WhatsAppAccount from the team as bridge, or create a placeholder
    let waAccount = await prisma.whatsAppAccount.findFirst({ where: { teamId: board.teamId } })
    if (!waAccount) {
      waAccount = await prisma.whatsAppAccount.create({
        data: { teamId: board.teamId, phoneNumber: `wa-board-${params.id}`, status: "ACTIVE" },
      })
    }
    waAccountId = waAccount.id
  }

  const firstState = await prisma.state.findFirst({
    where: { boardId: params.id },
    orderBy: { orderIndex: "asc" },
  })

  // Dedup: for WhatsApp by phone+waAccount, for telegram/manual by boardId+channel+externalId/phone
  if (channel === "whatsapp" && normalizedPhone && waAccountId) {
    const existing = await prisma.conversation.findFirst({
      where: { customerPhone: normalizedPhone, waAccountId },
    })
    if (existing) {
      if (!existing.boardId) {
        await prisma.conversation.update({
          where: { id: existing.id },
          data: { boardId: params.id, currentStateId: firstState?.id || null, customerName: name || existing.customerName },
        })
      }
      return NextResponse.json({ success: true, conversation: existing, message: "Lead already exists" }, { status: 200 })
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      customerPhone: normalizedPhone || `manual-${Date.now()}`,
      customerName: name || normalizedPhone || "Neuer Lead",
      waAccountId: waAccountId || null,
      boardId: params.id,
      currentStateId: firstState?.id || null,
      source,
      tags: tags || [],
      status: "ACTIVE",
      channel,
      externalId: null, // for telegram: set when lead clicks deep link
      customData: email ? { email } : {},
    },
  })

  return NextResponse.json({ success: true, conversation }, { status: 201 })
}
