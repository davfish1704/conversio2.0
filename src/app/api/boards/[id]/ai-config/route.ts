import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"
import { PROVIDER_MODELS } from "@/lib/ai/registry"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

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
  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const existing = await prisma.aIProviderConfig.findUnique({ where: { boardId: params.id } })
  const body = await req.json()
  const { defaultProvider, defaultModel, fallbackProvider, fallbackModel, modelOverrides } = body

  // Only overwrite fields that are explicitly provided in the request body.
  // This prevents accidental resets (e.g. when the frontend sends a partial
  // update or the GET config request failed and state is at default "groq").
  const merge = <T>(field: T | undefined, fallback: T | undefined | null): T | null =>
    field !== undefined ? (field as T | null) : (fallback ?? null)

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
      ...(defaultProvider !== undefined ? { defaultProvider } : {}),
      ...(defaultModel !== undefined ? { defaultModel } : {}),
      ...(fallbackProvider !== undefined ? { fallbackProvider: fallbackProvider || null } : {}),
      ...(fallbackModel !== undefined ? { fallbackModel: fallbackModel || null } : {}),
      ...(modelOverrides !== undefined ? { modelOverrides } : {}),
    },
  })

  const oldProvider = existing?.defaultProvider ?? "(none)"
  const newProvider = config.defaultProvider
  if (oldProvider !== newProvider) {
    console.log(`[AI-Config] Board ${params.id}: Provider-Änderung ${oldProvider} → ${newProvider} (User: ${session.user.id})`)
  }

  return NextResponse.json({ config })
}
