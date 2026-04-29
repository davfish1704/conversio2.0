import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

/**
 * Prüft ob der Nutzer Zugriff auf eine Conversation hat (via Board-Mitgliedschaft).
 * Gibt null zurück bei Erfolg, NextResponse 404 wenn keine Berechtigung oder nicht gefunden.
 */
export async function assertConversationOwnership(
  conversationId: string,
  userId: string
): Promise<NextResponse | null> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      board: {
        members: {
          some: { userId },
        },
      },
    },
    select: { id: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return null
}

/**
 * Prüft ob der Nutzer Zugriff auf einen AdminReport hat (via Board-Mitgliedschaft).
 * Gibt null zurück bei Erfolg, NextResponse 404 wenn keine Berechtigung oder nicht gefunden.
 */
export async function assertReportOwnership(
  reportId: string,
  userId: string
): Promise<NextResponse | null> {
  const report = await prisma.adminReport.findFirst({
    where: {
      id: reportId,
      board: {
        members: {
          some: { userId },
        },
      },
    },
    select: { id: true },
  })

  if (!report) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return null
}

/**
 * Prueft ob der Nutzer Mitglied des Boards ist (via board.members.some).
 * Gibt null zurueck bei Erfolg, NextResponse 404 wenn kein Zugriff.
 */
export async function assertBoardMemberAccess(
  boardId: string,
  userId: string
): Promise<NextResponse | null> {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      members: { some: { userId } },
    },
    select: { id: true },
  })
  if (!board) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return null
}

/**
 * Prueft ob ein TeamMember (targetMemberId) zum selben Team gehoert wie der aufrufende User.
 * Gibt null zurueck bei Erfolg, NextResponse 404 wenn kein Zugriff oder nicht gefunden.
 */
export async function assertTeamMemberInOwnTeam(
  targetMemberId: string,
  userId: string
): Promise<NextResponse | null> {
  const myMembership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { teamId: true },
  })
  if (!myMembership) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  const targetMember = await prisma.teamMember.findFirst({
    where: { id: targetMemberId, teamId: myMembership.teamId },
    select: { id: true },
  })
  if (!targetMember) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return null
}
