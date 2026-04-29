import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

/**
 * POST /api/boards/[id]/leads
 * Create a new lead/conversation for a board
 * Body: { name, phone, email?, tags?, source?: "manual" | "api" }
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    // Verify access
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ["ADMIN", "AGENT"] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    const body = await req.json()
    const { name, phone, email, tags, source = "manual" } = body

    if (!phone) {
      return jsonError("Phone number is required.", "INVALID_INPUT", 400)
    }

    // Normalize phone: ensure starts with +
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`

    // Find or create WhatsApp account for this board's team
    const board = await prisma.board.findUnique({
      where: { id: params.id },
      select: { teamId: true },
    })

    if (!board) {
      return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)
    }

    let waAccount = await prisma.whatsAppAccount.findFirst({
      where: { teamId: board.teamId },
    })

    if (!waAccount) {
      // Create a placeholder WA account
      waAccount = await prisma.whatsAppAccount.create({
        data: {
          teamId: board.teamId,
          phoneNumber: normalizedPhone,
          status: "ACTIVE",
        },
      })
    }

    // Get first state of board for initial assignment
    const firstState = await prisma.state.findFirst({
      where: { boardId: params.id },
      orderBy: { orderIndex: "asc" },
    })

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        customerPhone: normalizedPhone,
        waAccountId: waAccount.id,
      },
    })

    if (existing) {
      // Update board assignment if not already set
      if (!existing.boardId) {
        await prisma.conversation.update({
          where: { id: existing.id },
          data: {
            boardId: params.id,
            currentStateId: firstState?.id || null,
            customerName: name || existing.customerName,
            tags: tags || existing.tags,
          },
        })
      }
      return NextResponse.json(
        { success: true, conversation: existing, message: "Lead already exists, board assignment updated" },
        { status: 200 }
      )
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        customerPhone: normalizedPhone,
        customerName: name || normalizedPhone,
        waAccountId: waAccount.id,
        boardId: params.id,
        currentStateId: firstState?.id || null,
        source,
        tags: tags || [],
        status: "ACTIVE",
      },
    })

    return NextResponse.json({ success: true, conversation }, { status: 201 })
  } catch (error) {
    console.error("Leads API error:", error)
    return jsonError("Lead could not be created. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
