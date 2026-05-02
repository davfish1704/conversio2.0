"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import PipelineBoard from "@/components/boards/PipelineBoard"
import EmptyStateCard from "@/components/boards/EmptyStateCard"
import LeadImportModal from "@/components/boards/LeadImportModal"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import BoardTabs from "@/components/boards/BoardTabs"
import { type Lead } from "@/components/boards/LeadCard"
import { useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

interface State {
  id: string
  name: string
  type: string
  mission: string | null
  rules: string | null
  orderIndex: number
  nextStateId: string | null
  config: Record<string, unknown> | null
}

interface PipelineState {
  id: string
  name: string
  orderIndex: number
  type: string
  leads: Lead[]
}

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function BoardPipelinePage() {
  const { id } = useParams() as { id: string }
  const { t } = useContext(LanguageContext)
  const [board, setBoard] = useState<Board | null>(null)
  const [states, setStates] = useState<State[]>([])
  const [pipelineStates, setPipelineStates] = useState<PipelineState[]>([])
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setNotFound(false)
    try {
      const [boardRes, statesRes, pipelineRes] = await Promise.all([
        fetch(`/api/boards/${id}`, { signal: controller.signal }),
        fetch(`/api/boards/${id}/states`, { signal: controller.signal }),
        fetch(`/api/crm/pipeline?boardId=${id}`, { signal: controller.signal }),
      ])
      if (boardRes.status === 404 || boardRes.status === 403) {
        setNotFound(true)
        return
      }
      if (!boardRes.ok || !statesRes.ok || !pipelineRes.ok) throw new Error("Fetch failed")
      const boardData = await boardRes.json()
      const statesData = await statesRes.json()
      const pipelineData = await pipelineRes.json()
      setBoard(boardData.board || boardData)
      setStates(statesData.states || [])
      setPipelineStates(pipelineData.states || [])
      setUnassignedLeads(pipelineData.unassignedLeads || [])
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (loading || (!board && !notFound)) return <BoardSkeleton />
  if (notFound || !board) return <div className="p-8 text-center text-gray-500">{t("board.notFound")}</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <BoardTabs board={board} />

      {/* Pipeline Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("crm.pipeline")}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {pipelineStates.reduce((sum, s) => sum + s.leads.length, 0) + unassignedLeads.length} {t("common.leads")}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              {t("common.import")}
            </button>
            <button
              disabled
              title="Add lead manually – coming soon"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg opacity-50 cursor-not-allowed"
            >
              + {t("common.addLead")}
            </button>
          </div>
        </div>

        {states.length === 0 && unassignedLeads.length === 0 ? (
          <EmptyStateCard boardId={id} onImportClick={() => setShowImportModal(true)} />
        ) : (
          <PipelineBoard
            states={pipelineStates}
            boardId={id}
            unassignedLeads={unassignedLeads}
            onRefresh={fetchAll}
          />
        )}
      </div>

      <LeadImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        boardId={id}
        onSuccess={fetchAll}
      />
    </div>
  )
}
