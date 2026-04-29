import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: params.id,
        members: { some: { userId: session.user.id } },
      },
      include: {
        states: {
          orderBy: { orderIndex: "asc" },
          take: 1,
        },
      },
    })

    if (!board) {
      return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)
    }

    const fieldDefinitions = (board.states[0]?.fieldDefinitions as unknown[] | null) || []

    if (fieldDefinitions.length === 0) {
      const defaults = [
        { id: "name", name: "Name", type: "text", required: false },
        { id: "phone", name: "Phone", type: "text", required: true },
        { id: "email", name: "Email", type: "text", required: false },
        { id: "address", name: "Address", type: "text", required: false },
        { id: "zip", name: "ZIP", type: "text", required: false },
        { id: "city", name: "City", type: "text", required: false },
        { id: "country", name: "Country", type: "text", required: false },
        { id: "price", name: "Price", type: "number", required: false },
        { id: "notes", name: "Notes", type: "textarea", required: false },
      ]
      return NextResponse.json({ fields: defaults })
    }

    return NextResponse.json({ fields: fieldDefinitions })
  } catch (error) {
    console.error("Fields API error:", error)
    return jsonError("Fields could not be loaded. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
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
    const { fields } = body

    if (!Array.isArray(fields)) {
      return jsonError("Invalid request. Please check your inputs.", "INVALID_INPUT", 400)
    }

    await prisma.state.updateMany({
      where: { boardId: params.id },
      data: { fieldDefinitions: fields },
    })

    return NextResponse.json({ fields })
  } catch (error) {
    console.error("Fields update error:", error)
    return jsonError("Fields could not be saved. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
