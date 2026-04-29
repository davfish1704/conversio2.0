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

    const faqs = await prisma.brainFAQ.findMany({
      where: { boardId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ faqs })
  } catch (error) {
    console.error("Brain FAQs GET error:", error)
    return NextResponse.json({ error: "Failed to load FAQs" }, { status: 500 })
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

    const { question, answer, category } = await req.json()

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer required" }, { status: 400 })
    }

    const faq = await prisma.brainFAQ.create({
      data: {
        boardId: id,
        question,
        answer,
        category,
      },
    })

    return NextResponse.json({ faq }, { status: 201 })
  } catch (error) {
    console.error("Brain FAQs POST error:", error)
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 })
  }
}
