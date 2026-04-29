import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { assertTeamMemberInOwnTeam } from "@/lib/auth-helpers"

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const denied = await assertTeamMemberInOwnTeam(params.id, session.user.id)
  if (denied) return denied

  const body = await req.json()
  const { role } = body

  const member = await prisma.teamMember.update({
    where: { id: params.id },
    data: { role }
  })

  return NextResponse.json(member)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const denied = await assertTeamMemberInOwnTeam(params.id, session.user.id)
  if (denied) return denied

  await prisma.teamMember.delete({
    where: { id: params.id }
  })

  return NextResponse.json({ success: true })
}
