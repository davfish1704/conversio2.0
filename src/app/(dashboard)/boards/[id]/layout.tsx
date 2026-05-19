import { prisma } from "@/lib/db"
import { BreadcrumbSetter } from "./breadcrumb-setter"

export default async function BoardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  let boardName: string | null = null

  try {
    const board = await prisma.board.findUnique({
      where: { id: params.id },
      select: { name: true },
    })
    if (board) boardName = board.name
  } catch {
    // Board nicht gefunden oder DB-Error — Breadcrumb zeigt nur "Boards"
  }

  return (
    <>
      <BreadcrumbSetter boardId={params.id} boardName={boardName} />
      {children}
    </>
  )
}
