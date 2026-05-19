"use client"

import { useEffect } from "react"
import { setBreadcrumb } from "@/lib/breadcrumb-store"

export function BreadcrumbSetter({
  boardId,
  boardName,
}: {
  boardId: string
  boardName: string | null
}) {
  useEffect(() => {
    if (boardName) {
      setBreadcrumb(boardId, boardName)
    }
  }, [boardId, boardName])

  return null
}
