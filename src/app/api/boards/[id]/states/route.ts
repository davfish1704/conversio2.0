import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { assertBoardAccess, toNextResponse } from "@/lib/auth/assert-board-access"

function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: true, message, code }, { status })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
    const board = await prisma.board.findUnique({
      where: { id: params.id },
      select: { name: true },
    })

    if (!board) {
      return jsonError("Board was deleted or you don't have access.", "BOARD_NOT_FOUND", 404)
    }

    const states = await prisma.state.findMany({
      where: { boardId: params.id },
      orderBy: { orderIndex: 'asc' },
    })

    return NextResponse.json({ boardName: board.name, states })
  } catch (error) {
    console.error("States API error:", error)
    return jsonError("States could not be loaded. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const body = await req.json()
    const {
      name, orderIndex, type, rules, nextStateId, config,
      dataToCollect, completionRule, availableTools,
      behaviorMode, escalateOnLowConfidence, escalateOnOffMission,
      escalateOnNoReply, maxFollowups, followupAction, allowChannelSwitch,
      agentRole, agentSystemPrompt, agentGoal,
      handoffMode, handoffRules, minAgentConfidence, nextStateOnFail,
    } = body

    if (!name) {
      return jsonError("Name is required.", "INVALID_INPUT", 400)
    }

    try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'AGENT'] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    const dataToCollectArr = Array.isArray(dataToCollect)
      ? dataToCollect
      : typeof dataToCollect === "string" && dataToCollect.trim()
        ? dataToCollect.split(",").map((s: string) => s.trim()).filter(Boolean)
        : []

    const availableToolsArr = Array.isArray(availableTools) ? availableTools : []

    const state = await prisma.state.create({
      data: {
        name,
        boardId: params.id,
        orderIndex: orderIndex ?? 0,
        type: type || 'MESSAGE',
        rules: rules || null,
        nextStateId: nextStateId || null,
        config: config || null,
        dataToCollect: dataToCollectArr,
        completionRule: completionRule || null,
        availableTools: availableToolsArr,
        behaviorMode: behaviorMode || null,
        escalateOnLowConfidence: escalateOnLowConfidence ?? true,
        escalateOnOffMission: escalateOnOffMission ?? true,
        escalateOnNoReply: escalateOnNoReply ?? null,
        maxFollowups: maxFollowups ?? 3,
        followupAction: followupAction || "escalate",
        allowChannelSwitch: allowChannelSwitch ?? true,
        agentRole: agentRole || null,
        agentSystemPrompt: agentSystemPrompt || null,
        agentGoal: agentGoal || null,
        handoffMode: handoffMode || "HYBRID",
        handoffRules: Array.isArray(handoffRules) ? handoffRules : [],
        minAgentConfidence: typeof minAgentConfidence === "number" ? minAgentConfidence : 0.7,
        nextStateOnFail: nextStateOnFail || null,
      },
    })

    return NextResponse.json({ state }, { status: 201 })
  } catch (error) {
    console.error("State create error:", error)
    return jsonError("State could not be created. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const body = await req.json()
    const {
      id: stateId, name, type, rules, orderIndex, nextStateId, config,
      dataToCollect, completionRule, availableTools,
      behaviorMode, escalateOnLowConfidence, escalateOnOffMission,
      escalateOnNoReply, maxFollowups, followupAction, allowChannelSwitch,
      agentRole, agentSystemPrompt, agentGoal,
      handoffMode, handoffRules, minAgentConfidence, nextStateOnFail,
    } = body

    if (!stateId) {
      return jsonError("State ID is required.", "INVALID_INPUT", 400)
    }

    try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'AGENT'] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    const dataToCollectArr = Array.isArray(dataToCollect)
      ? dataToCollect
      : typeof dataToCollect === "string" && dataToCollect.trim()
        ? dataToCollect.split(",").map((s: string) => s.trim()).filter(Boolean)
        : dataToCollect !== undefined ? [] : undefined

    const availableToolsArr = Array.isArray(availableTools) ? availableTools : availableTools !== undefined ? [] : undefined

    const state = await prisma.state.update({
      where: { id: stateId },
      data: {
        name,
        type: type || 'MESSAGE',
        rules: rules || null,
        orderIndex: orderIndex !== undefined ? orderIndex : undefined,
        nextStateId: nextStateId !== undefined ? (nextStateId || null) : undefined,
        config: config !== undefined ? (config || null) : undefined,
        ...(dataToCollectArr !== undefined ? { dataToCollect: dataToCollectArr } : {}),
        ...(completionRule !== undefined ? { completionRule: completionRule || null } : {}),
        ...(availableToolsArr !== undefined ? { availableTools: availableToolsArr } : {}),
        ...(behaviorMode !== undefined ? { behaviorMode: behaviorMode || null } : {}),
        ...(escalateOnLowConfidence !== undefined ? { escalateOnLowConfidence } : {}),
        ...(escalateOnOffMission !== undefined ? { escalateOnOffMission } : {}),
        ...(escalateOnNoReply !== undefined ? { escalateOnNoReply: escalateOnNoReply ?? null } : {}),
        ...(maxFollowups !== undefined ? { maxFollowups: maxFollowups ?? 3 } : {}),
        ...(followupAction !== undefined ? { followupAction: followupAction || "escalate" } : {}),
        ...(allowChannelSwitch !== undefined ? { allowChannelSwitch } : {}),
        ...(agentRole !== undefined ? { agentRole: agentRole || null } : {}),
        ...(agentSystemPrompt !== undefined ? { agentSystemPrompt: agentSystemPrompt || null } : {}),
        ...(agentGoal !== undefined ? { agentGoal: agentGoal || null } : {}),
        ...(handoffMode !== undefined ? { handoffMode } : {}),
        ...(handoffRules !== undefined ? { handoffRules: Array.isArray(handoffRules) ? handoffRules : [] } : {}),
        ...(minAgentConfidence !== undefined ? { minAgentConfidence: typeof minAgentConfidence === "number" ? minAgentConfidence : 0.7 } : {}),
        ...(nextStateOnFail !== undefined ? { nextStateOnFail: nextStateOnFail || null } : {}),
      },
    })

    return NextResponse.json({ state })
  } catch (error) {
    console.error("State update error:", error)
    return jsonError("State could not be updated. Please try again later.", "INTERNAL_ERROR", 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError("Please sign in.", "UNAUTHORIZED", 401)
  }

  try {
    const { searchParams } = new URL(req.url)
    const stateId = searchParams.get('stateId')

    if (!stateId) {
      return jsonError("State ID is required.", "INVALID_INPUT", 400)
    }

    try { await assertBoardAccess({ userId: session.user.id, boardId: params.id }) } catch (e) { return toNextResponse(e) }
    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId: params.id,
        userId: session.user.id,
        role: { in: ['ADMIN', 'AGENT'] },
      },
    })

    if (!membership) {
      return jsonError("You don't have permission for this action.", "FORBIDDEN", 403)
    }

    await prisma.$transaction(async (tx) => {
      await tx.agentRun.deleteMany({
        where: { stateId },
      })

      await tx.state.delete({
        where: { id: stateId },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("State delete error:", error)
    return jsonError("State could not be deleted. Please try again later.", "INTERNAL_ERROR", 500)
  }
}
