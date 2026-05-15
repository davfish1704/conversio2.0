import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { aiRegistry } from "@/lib/ai/registry"
import { sanitizeAIOutput } from "@/lib/ai/prompt/builder"
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"
import { buildSubAgentSystemPrompt } from "@/lib/agents/sub-agent-prompt-builder"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

  try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }

  const body = await req.json()
  const { message, state, mission } = body

  const brain = await prisma.boardBrain.findUnique({ where: { boardId: params.id } })

  const brainConfig = brain ?? {
    systemPrompt: "",
    stylePrompt: "Professionell und freundlich",
    infoPrompt:  "",
    rulePrompt:  "",
    language:    "de",
    tone:        "friendly",
    temperature: 0.7,
    maxTokens:   500,
  }

  const systemPrompt = buildSubAgentSystemPrompt({
    agentRole:         null,
    agentGoal:         mission ?? null,
    agentSystemPrompt: null,
    handoffMode:       "LLM_ONLY",
    stateName:         state ?? "Simulation",
    dataToCollect:     [],
    brain: {
      systemPrompt: brainConfig.systemPrompt,
      stylePrompt:  brainConfig.stylePrompt,
      infoPrompt:   brainConfig.infoPrompt,
      rulePrompt:   brainConfig.rulePrompt,
      language:     brainConfig.language,
      tone:         brainConfig.tone,
    },
    knowledge:           { rules: [], faqs: [], docs: [] },
    memories:            [],
    conversationSummary: null,
    channel:             "whatsapp",
    leadChannels:        [],
    customData:          {},
  })

  try {
    const response = await aiRegistry.execute({
      boardId:     params.id,
      purpose:     "main",
      messages:    [
        { role: "system", content: systemPrompt },
        { role: "user",   content: message ?? "Hallo" },
      ],
      temperature: brainConfig.temperature ?? 0.7,
      maxTokens:   brainConfig.maxTokens   ?? 500,
    })

    const text = sanitizeAIOutput(response.content ?? "")

    return NextResponse.json({
      response: {
        text,
        sentMessages:     [text],
        stateTransitions: [],
        toolCallCount:    response.toolCalls?.length ?? 0,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `KI nicht verfügbar: ${msg}` }, { status: 503 })
  }
}
