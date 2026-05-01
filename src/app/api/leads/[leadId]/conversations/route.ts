import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"

export async function GET(_req: NextRequest, { params }: { params: { leadId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await (prisma as any).lead.findFirst({
    where: {
      id: params.leadId,
      board: { members: { some: { userId: session.user.id } } },
    },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        include: {
          messages: { orderBy: { timestamp: "desc" }, take: 1 },
        },
      },
    },
  })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ conversations: lead.conversations })
}
