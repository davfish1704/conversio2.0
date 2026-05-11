import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

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
    try { await assertBoardAccess({ userId: session.user.id, boardId: id }) } catch (e) { return toNextResponse(e) }

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
    try { await assertBoardAccess({ userId: session.user.id, boardId: id }) } catch (e) { return toNextResponse(e) }

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = params

  try {
    try { await assertBoardAccess({ userId: session.user.id, boardId: id }) } catch (e) { return toNextResponse(e) }

    const { id: faqId } = await req.json()
    if (!faqId) {
      return NextResponse.json({ error: "FAQ ID required" }, { status: 400 })
    }

    await prisma.brainFAQ.delete({ where: { id: faqId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Brain FAQs DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 })
  }
}
