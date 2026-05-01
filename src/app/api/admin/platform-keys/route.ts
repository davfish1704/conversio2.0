import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { encrypt } from "@/lib/crypto/secrets"
import { aiRegistry } from "@/lib/ai/registry"
import type { AIProviderName } from "@/lib/ai/registry"

const VALID_PROVIDERS: AIProviderName[] = ["groq", "openrouter", "openai", "deepseek", "anthropic"]

async function assertAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  // Allow ADMIN role users or check user email matches platform admin
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  if (user?.role !== "ADMIN") return null
  return session
}

export async function GET() {
  const session = await assertAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keys = await prisma.platformAPIKey.findMany({
    select: { id: true, provider: true, isActive: true, monthlyBudgetCents: true, createdAt: true },
    orderBy: { provider: "asc" },
  })

  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const session = await assertAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { provider, apiKey, isActive, monthlyBudgetCents } = body

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `Ungültiger Provider. Erlaubt: ${VALID_PROVIDERS.join(", ")}` }, { status: 400 })
  }
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API-Key darf nicht leer sein" }, { status: 400 })
  }

  const record = await prisma.platformAPIKey.upsert({
    where: { provider },
    create: {
      provider,
      encryptedKey: encrypt(apiKey.trim()),
      isActive: isActive ?? true,
      monthlyBudgetCents: monthlyBudgetCents ?? null,
    },
    update: {
      encryptedKey: encrypt(apiKey.trim()),
      isActive: isActive ?? true,
      monthlyBudgetCents: monthlyBudgetCents ?? null,
    },
  })

  // Invalidate registry cache so next request uses the new key
  aiRegistry.invalidateKeyCache(provider as AIProviderName)

  return NextResponse.json({
    key: { id: record.id, provider: record.provider, isActive: record.isActive, monthlyBudgetCents: record.monthlyBudgetCents },
  })
}

export async function DELETE(req: NextRequest) {
  const session = await assertAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const provider = searchParams.get("provider")

  if (!provider || !VALID_PROVIDERS.includes(provider as AIProviderName)) {
    return NextResponse.json({ error: "Gültiger Provider-Parameter erforderlich" }, { status: 400 })
  }

  await prisma.platformAPIKey.delete({ where: { provider } }).catch(() => null)
  aiRegistry.invalidateKeyCache(provider as AIProviderName)

  return NextResponse.json({ ok: true })
}
