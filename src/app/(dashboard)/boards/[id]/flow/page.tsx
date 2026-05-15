"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import FlowBuilder from "@/components/flow-builder/FlowBuilder"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import BoardTabs from "@/components/boards/BoardTabs"

interface State {
  id: string
  name: string
  type: string
  rules: string | null
  orderIndex: number
  nextStateId: string | null
  config: Record<string, unknown> | null
  agentGoal?: string | null
}

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function BoardFlowPage() {
  const { id } = useParams() as { id: string }
  const [board, setBoard] = useState<Board | null>(null)
  const [states, setStates] = useState<State[]>([])
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const [boardRes, statesRes] = await Promise.all([
        fetch(`/api/boards/${id}`, { signal: controller.signal }),
        fetch(`/api/boards/${id}/states`, { signal: controller.signal }),
      ])
      if (!boardRes.ok || !statesRes.ok) throw new Error("Fetch failed")
      const boardData = await boardRes.json()
      const statesData = await statesRes.json()
      setBoard(boardData.board || boardData)
      setStates(statesData.states || [])
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (loading) return <BoardSkeleton />
  if (!board) return <div className="p-8 text-center text-muted-foreground text-sm">Board nicht gefunden</div>

  return (
    <div className="min-h-screen bg-background">
      <BoardTabs board={board} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FlowBuilder states={states} boardId={id} onChange={fetchAll} />
      </div>
    </div>
  )
}
