import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardMemberAccess } from "@/lib/auth-helpers"
import { PROVIDER_MODELS } from "@/lib/ai/registry"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const config = await prisma.aIProviderConfig.findUnique({ where: { boardId: params.id } })

  return NextResponse.json({
    config: config ?? {
      defaultProvider: "groq",
      defaultModel: "llama-3.3-70b-versatile",
      fallbackProvider: null,
      fallbackModel: null,
      modelOverrides: {},
    },
    providers: PROVIDER_MODELS,
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const denied = await assertBoardMemberAccess(params.id, session.user.id)
  if (denied) return denied

  const body = await req.json()
  const { defaultProvider, defaultModel, fallbackProvider, fallbackModel, modelOverrides } = body

  const config = await prisma.aIProviderConfig.upsert({
    where: { boardId: params.id },
    create: {
      boardId: params.id,
      defaultProvider: defaultProvider ?? "groq",
      defaultModel: defaultModel ?? "llama-3.3-70b-versatile",
      fallbackProvider: fallbackProvider || null,
      fallbackModel: fallbackModel || null,
      modelOverrides: modelOverrides ?? {},
    },
    update: {
      defaultProvider: defaultProvider ?? "groq",
      defaultModel: defaultModel ?? "llama-3.3-70b-versatile",
      fallbackProvider: fallbackProvider || null,
      fallbackModel: fallbackModel || null,
      modelOverrides: modelOverrides ?? {},
    },
  })

  return NextResponse.json({ config })
}
