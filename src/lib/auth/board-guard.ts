import { prisma } from "@/lib/db"

export class BoardAccessError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "BoardAccessError"
  }
}

// Strict ownership check — use for destructive owner-only operations
export async function requireBoardOwner(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: userId },
  })
  if (!board) throw new BoardAccessError("Forbidden")
  return board
}

// Membership check — use for general read/write access
export async function requireBoardMember(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, members: { some: { userId } } },
  })
  if (!board) throw new BoardAccessError("Forbidden")
  return board
}
