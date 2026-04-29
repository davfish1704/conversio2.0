import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const board = await prisma.board.findFirst({
      where: { id, members: { some: { userId: session.user.id } } },
    })
    if (!board) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    const rules = await prisma.brainRule.findMany({
      where: { boardId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ rules })
  } catch (error) {
    console.error("Brain rules GET error:", error)
    return NextResponse.json({ error: "Failed to load rules" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    const board = await prisma.board.findFirst({
      where: { id, members: { some: { userId: session.user.id } } },
    })
    if (!board) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
    }

    const { name, rule, severity = "warning" } = await req.json()

    if (!name || !rule) {
      return NextResponse.json({ error: "Name and rule required" }, { status: 400 })
    }

    const brainRule = await prisma.brainRule.create({
      data: {
        boardId: id,
        name,
        rule,
        severity,
      },
    })

    return NextResponse.json({ rule: brainRule }, { status: 201 })
  } catch (error) {
    console.error("Brain rules POST error:", error)
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 })
  }
}
