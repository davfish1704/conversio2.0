import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { assertConversationOwnership } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const denied = await assertConversationOwnership(params.id, session.user.id)
  if (denied) return denied

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
