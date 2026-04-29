import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

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
    })

    if (!board) {
      return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)
    }

    const brain = await prisma.boardBrain.findUnique({
      where: { boardId: params.id },
    })

    return NextResponse.json(
      brain || {
        systemPrompt: "",
        stylePrompt: "",
        infoPrompt: "",
        rulePrompt: "",
        defaultModel: "conversio",
        temperature: 0.7,
        language: "en",
        tone: "friendly",
      }
    )
  } catch (error) {
    console.error("Brain API error:", error)
    return jsonError("Data could not be loaded. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function PUT(
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

    const data = await req.json()

    const brain = await prisma.boardBrain.upsert({
      where: { boardId: params.id },
      update: data,
      create: { ...data, boardId: params.id },
    })

    return NextResponse.json(brain)
  } catch (error) {
    console.error("Brain update error:", error)
    return jsonError("Settings could not be saved. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
