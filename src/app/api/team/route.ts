import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Finde meine Team-Mitgliedschaft
    const myMembership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      include: { team: true },
    })

    if (!myMembership) {
      return NextResponse.json({ team: null, members: [], role: null })
    }

    // Alle Mitglieder des Teams laden
    const members = await prisma.teamMember.findMany({
      where: { teamId: myMembership.teamId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { joinedAt: "asc" },
    })

    return NextResponse.json({
      team: myMembership.team,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      myRole: myMembership.role,
    })
  } catch (error) {
    console.error("Team GET error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
