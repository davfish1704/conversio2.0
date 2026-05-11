import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { assertConversationAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try { await assertConversationAccess({ userId: session.user.id, conversationId: params.id }) } catch (e) { return toNextResponse(e) }

  const { aiEnabled } = await req.json()

  if (typeof aiEnabled !== "boolean") {
    return NextResponse.json({ error: "aiEnabled must be a boolean" }, { status: 400 })
  }

  const conversation = await prisma.conversation.update({
    where: { id: params.id },
    data: { aiEnabled, updatedAt: new Date() },
    select: { aiEnabled: true },
  })

  return NextResponse.json({ aiEnabled: conversation.aiEnabled })
}
