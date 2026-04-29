import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        image: true, 
        role: true, 
        timezone: true,
        language: true,
        createdAt: true 
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json(user)
  } catch (error) {
    console.error("User GET error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, timezone, language, currentPassword, newPassword } = await req.json()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (timezone !== undefined) updateData.timezone = timezone
    if (language !== undefined) updateData.language = language

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Aktuelles Passwort ist erforderlich" }, { status: 400 })
      }
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      })
      if (!currentUser?.password) {
        return NextResponse.json({ error: "Kein Passwort gesetzt (OAuth-Konto)" }, { status: 400 })
      }
      const valid = await bcrypt.compare(currentPassword, currentUser.password)
      if (!valid) {
        return NextResponse.json({ error: "Aktuelles Passwort ist falsch" }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Neues Passwort muss mindestens 6 Zeichen haben" }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { 
        id: true, 
        name: true, 
        email: true, 
        image: true, 
        role: true,
        timezone: true,
        language: true
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("User PATCH error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
