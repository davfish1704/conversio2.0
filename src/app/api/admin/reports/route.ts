import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // Only admins can access admin reports
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const reports = await prisma.adminReport.findMany({
      include: { board: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const mapped = reports.map((r) => ({
      id: r.id,
      boardName: r.board.name,
      stateName: null,
      type: r.type,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error("Admin reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
