import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { deleteFromR2 } from "@/lib/r2"
import { assetUpdateSchema } from "@/lib/validators/asset"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

type Params = { id: string; assetId: string }

export async function PATCH(
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
  const parsed = assetUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Daten", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updated = await prisma.asset.update({
    where: { id: params.assetId },
    data:  parsed.data,
    include: { links: { select: { stateId: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, boardId: params.id },
  })
  if (!asset) return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 })

  // R2 first — if this fails we log and continue so we don't leave orphaned DB rows
  try {
    await deleteFromR2(asset.r2Key)
  } catch (err) {
    console.error("[asset-delete] R2 delete failed, continuing with DB delete:", err)
  }

  // Cascade in DB handles asset_states rows automatically
  await prisma.asset.delete({ where: { id: params.assetId } })

  return new NextResponse(null, { status: 204 })
}
