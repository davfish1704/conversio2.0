import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, role = "MEMBER" } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    // Prüfe ob ich Admin/Owner bin
    const myMembership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!myMembership || myMembership.role === "VIEWER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Prüfe ob User existiert
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 })
    }

    // Prüfe ob bereits Mitglied
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: myMembership.teamId, userId: user.id } },
    })

    if (existing) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 409 })
    }

    // Erstelle Team-Mitgliedschaft
    const member = await prisma.teamMember.create({
      data: {
        teamId: myMembership.teamId,
        userId: user.id,
        role: role as "ADMIN" | "MEMBER" | "VIEWER",
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    })

    return NextResponse.json({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
      joinedAt: member.joinedAt,
    })
  } catch (error) {
    console.error("Team invite error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
