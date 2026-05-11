import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export class AccessError extends Error {
  constructor(
    message = "Forbidden",
    public readonly context?: {
      userId?: string
      boardId?: string
      conversationId?: string
      reason?: string
    },
  ) {
    super(message)
    this.name = "AccessError"
  }
}

export interface BoardAccessResult {
  boardId: string
  boardName: string
  role: string
  isAdmin: boolean
}

const metrics = {
  deniedCount: 0,
  adminOverrideCount: 0,
  conversationDeniedCount: 0,
  reportDeniedCount: 0,
  teamMemberDeniedCount: 0,
  boardsAccessed: new Map<string, number>(),
  repeatedDenials: new Map<string, number>(),
}

export function getAuthMetrics() {
  return {
    deniedCount: metrics.deniedCount,
    adminOverrideCount: metrics.adminOverrideCount,
    conversationDeniedCount: metrics.conversationDeniedCount,
    reportDeniedCount: metrics.reportDeniedCount,
    teamMemberDeniedCount: metrics.teamMemberDeniedCount,
    topBoards: [...metrics.boardsAccessed.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([boardId, count]) => ({ boardId, count })),
    repeatedDenials: [...metrics.repeatedDenials.entries()]
      .filter(([, count]) => count > 3)
      .map(([userId, count]) => ({ userId, count })),
  }
}

function logDenial(params: {
  reason: string
  userId?: string
  boardId?: string
  conversationId?: string
}) {
  const key = params.userId || "unknown"
  metrics.deniedCount++
  metrics.repeatedDenials.set(key, (metrics.repeatedDenials.get(key) || 0) + 1)

  console.warn(
    `[AUTH_DENIED] reason=${params.reason} userId=${params.userId || "-"} boardId=${params.boardId || "-"} convId=${params.conversationId || "-"}`,
  )
}

function logAdminBypass(userId: string, boardId: string) {
  metrics.adminOverrideCount++
  console.info(
    `[AUTH_ADMIN_BYPASS] userId=${userId} boardId=${boardId}`,
  )
}

function logBoardAccess(boardId: string) {
  metrics.boardsAccessed.set(boardId, (metrics.boardsAccessed.get(boardId) || 0) + 1)
}

Error.stackTraceLimit = 100

export async function assertBoardAccess(params: {
  userId: string
  boardId: string
  allowAdminOverride?: boolean
}): Promise<BoardAccessResult> {
  const { userId, boardId, allowAdminOverride = true } = params

  let userRole: string | null = null
  if (allowAdminOverride) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    userRole = user?.role ?? null
    if (userRole === "ADMIN") {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { name: true },
      })
      if (board) {
        logAdminBypass(userId, boardId)
        logBoardAccess(boardId)
        return {
          boardId,
          boardName: board.name,
          role: "ADMIN",
          isAdmin: true,
        }
      }
      throw new AccessError("Board not found", { userId, boardId, reason: "board_not_found" })
    }
  }

  const membership = await prisma.boardMember.findFirst({
    where: { boardId, userId },
    include: { board: { select: { name: true } } },
  })
  if (!membership) {
    logDenial({ reason: "not_board_member", userId, boardId })
    throw new AccessError("Forbidden", { userId, boardId, reason: "not_board_member" })
  }

  logBoardAccess(boardId)
  return {
    boardId,
    boardName: membership.board.name,
    role: membership.role,
    isAdmin: false,
  }
}

export async function assertConversationAccess(params: {
  userId: string
  conversationId: string
}): Promise<{ boardId: string; conversationId: string }> {
  const { userId, conversationId } = params

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      board: { members: { some: { userId } } },
    },
    select: { id: true, boardId: true },
  })
  if (!conversation) {
    metrics.conversationDeniedCount++
    logDenial({ reason: "conversation_not_found", userId, conversationId })
    throw new AccessError("Forbidden", { userId, conversationId, reason: "conversation_not_found" })
  }

  return { boardId: conversation.boardId, conversationId: conversation.id }
}

export function toNextResponse(error: unknown): NextResponse {
  if (error instanceof AccessError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

export interface ReportAccessResult {
  reportId: string
}

export async function assertReportAccess(params: {
  userId: string
  reportId: string
}): Promise<ReportAccessResult> {
  const { userId, reportId } = params

  const report = await prisma.adminReport.findFirst({
    where: {
      id: reportId,
      board: { members: { some: { userId } } },
    },
    select: { id: true },
  })
  if (!report) {
    metrics.reportDeniedCount++
    logDenial({ reason: "report_not_found", userId })
    throw new AccessError("Report not found", { userId, reason: "report_not_found" })
  }

  return { reportId: report.id }
}

export async function assertTeamMemberAccess(params: {
  userId: string
  targetMemberId: string
}): Promise<void> {
  const { userId, targetMemberId } = params

  const myMembership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { teamId: true },
  })
  if (!myMembership) {
    metrics.teamMemberDeniedCount++
    logDenial({ reason: "team_not_found", userId })
    throw new AccessError("Team not found", { userId, reason: "team_not_found" })
  }

  const targetMember = await prisma.teamMember.findFirst({
    where: { id: targetMemberId, teamId: myMembership.teamId },
    select: { id: true },
  })
  if (!targetMember) {
    metrics.teamMemberDeniedCount++
    logDenial({ reason: "team_member_not_found", userId })
    throw new AccessError("Member not found", { userId, reason: "team_member_not_found" })
  }
}
