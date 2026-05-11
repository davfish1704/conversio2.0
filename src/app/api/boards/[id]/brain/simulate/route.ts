import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { runAgentLoop, type AgentLoopContext } from "@/lib/ai/tool-engine"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const body = await req.json()
  const { message, state, mission } = body

  const brain = await prisma.boardBrain.findUnique({
    where: { boardId: params.id },
  })

  const assets = await prisma.boardAsset.findMany({
    where: { boardId: params.id, isActive: true },
  })

  const brainConfig = brain || {
    id: "",
    boardId: params.id,
    systemPrompt: "",
    stylePrompt: "",
    infoPrompt: "",
    rulePrompt: "",
    defaultModel: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
    language: "en",
    tone: "friendly",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const loopCtx: AgentLoopContext = {
    conversationId: `simulate-${params.id}`,
    boardId: params.id,
    channel: "whatsapp",
    userMessage: message || "Hello",
    brain: brainConfig as any,
    state: {
      id: "simulate-state",
      name: state || "New Lead",
      mission: mission || null,
      rules: null,
      type: "AI",
      nextStateId: null,
      dataToCollect: [],
      completionRule: null,
    },
    customData: {},
    assets,
  }

  try {
    const result = await runAgentLoop(loopCtx, { simulate: true })

    const responseText = result.sentMessages.join("\n")

    return NextResponse.json({
      response: {
        text: responseText,
        sentMessages: result.sentMessages,
        stateTransitions: result.stateTransitions,
        toolCallCount: result.toolCallCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `KI nicht verfügbar: ${message}` }, { status: 503 })
  }
}
