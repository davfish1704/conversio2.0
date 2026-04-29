import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Only admins can update admin reports
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const report = await prisma.adminReport.update({
      where: { id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error("Admin report update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  await prisma.adminReport.delete({
    where: { id }
  })
  
  return NextResponse.json({ success: true })
}
