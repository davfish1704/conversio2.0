import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

const assetSchema = z.object({
  type: z.enum(["AUDIO_MEMO", "PDF_DOC", "IMAGE_ASSET", "TEXT_SNIPPET", "TEMPLATE", "KNOWLEDGE_BASE"]),
  name: z.string().min(1).max(200),
  content: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
})

async function checkBoardAccess(boardId: string, userId: string) {
  const membership = await prisma.boardMember.findFirst({
    where: {
      boardId,
      userId,
      role: { in: ["ADMIN", "AGENT"] },
    },
  })
  return !!membership
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const hasAccess = await checkBoardAccess(params.id, session.user.id)
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const assets = await prisma.boardAsset.findMany({
      where: { boardId: params.id },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(assets)
  } catch (error) {
    console.error("Assets fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const hasAccess = await checkBoardAccess(params.id, session.user.id)
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = assetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, name, content, fileUrl, metadata, tags } = parsed.data

    const asset = await prisma.boardAsset.create({
      data: {
        boardId: params.id,
        type,
        name,
        content: content || null,
        fileUrl: fileUrl || null,
        metadata: (metadata || undefined) as Prisma.InputJsonValue | undefined,
        tags: tags || [],
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error("Asset creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
