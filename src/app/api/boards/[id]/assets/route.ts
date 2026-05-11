import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"
import { assetQuerySchema } from "@/lib/validators/asset"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const parsed = assetQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams)
  )
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 })
  }

  const { type, tags, stateId, search, page, limit } = parsed.data
  const skip = (page - 1) * limit

  const where = {
    boardId: params.id,
    ...(type    ? { type }                                                         : {}),
    ...(tags    ? { tags: { hasSome: tags.split(",").map((t) => t.trim()).filter(Boolean) } } : {}),
    ...(stateId ? { links: { some: { stateId } } }                                : {}),
    ...(search  ? {
      OR: [
        { name:        { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { tags:        { hasSome: [search] } },
      ],
    } : {}),
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { links: { select: { stateId: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.asset.count({ where }),
  ])

  return NextResponse.json({
    assets,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
