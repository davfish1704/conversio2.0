import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assetStagesSchema } from "@/lib/validators/asset"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

type Params = { id: string; assetId: string }

export async function POST(
  req: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, boardId: params.id },
  })
  if (!asset) return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 })

  const body   = await req.json()
  const parsed = assetStagesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Daten", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { stageIds } = parsed.data

  // Verify every stateId belongs to this board (prevents cross-board injection)
  if (stageIds.length > 0) {
    const valid = await prisma.state.count({
      where: { id: { in: stageIds }, boardId: params.id },
    })
    if (valid !== stageIds.length) {
      return NextResponse.json({ error: "Ungültige Stage-IDs" }, { status: 400 })
    }
  }

  // Atomic replace of all stage links
  const [, created] = await prisma.$transaction([
    prisma.assetState.deleteMany({ where: { assetId: params.assetId } }),
    prisma.assetState.createMany({
      data: stageIds.map((stateId) => ({ assetId: params.assetId, stateId })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ stageIds, count: created.count })
}
