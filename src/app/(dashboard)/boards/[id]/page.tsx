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
import { setBreadcrumb } from "@/lib/breadcrumb-store"

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
  const [pipelineStates, setPipelineStates] = useState<PipelineState[]>([])
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
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
    setFetchError(null)
    try {
      const [boardRes, pipelineRes] = await Promise.all([
        fetch(`/api/boards/${id}`, { signal: controller.signal }),
        fetch(`/api/crm/pipeline?boardId=${id}`, { signal: controller.signal }),
      ])
      if (boardRes.status === 404 || boardRes.status === 403) {
        setNotFound(true)
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("crm_last_board_id")
          if (stored === id) localStorage.removeItem("crm_last_board_id")
        }
        return
      }
      if (!boardRes.ok || !pipelineRes.ok) throw new Error("Failed to fetch board data")
      const boardData = await boardRes.json()
      const pipelineData = await pipelineRes.json()
      setBoard(boardData.board || boardData)
      setPipelineStates(pipelineData.states || [])
      setUnassignedLeads(pipelineData.unassignedLeads || [])
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setFetchError(err instanceof Error ? err.message : "Connection error")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (loading || (!board && !notFound && !fetchError)) return <BoardSkeleton />
  if (fetchError) return (
    <div>
      <BoardTabs board={{ id, name: "", description: null, isActive: true }} />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-destructive font-medium">Verbindungsfehler</p>
        <p className="text-xs text-muted-foreground">{fetchError}</p>
        <button onClick={fetchAll} className="text-xs text-primary hover:underline">Erneut laden</button>
      </div>
    </div>
  )
  if (notFound || !board) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-muted-foreground">{t("board.notFound")}</p>
    </div>
  )

  useEffect(() => { if (board?.name) setBreadcrumb(id, board.name) }, [id, board?.name])

  const totalLeads = pipelineStates.reduce((sum, s) => sum + s.leads.length, 0) + unassignedLeads.length

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col bg-background">
      <BoardTabs board={board} />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Pipeline</span>
          <span className="text-xs tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {totalLeads} {t("common.leads")}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/15 transition-colors"
          >
            {t("common.import")}
          </button>
          <span
            className="relative group"
          >
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border border-border rounded-md cursor-default"
            >
              + {t("common.addLead")}
            </button>
            <div className="absolute right-0 top-full mt-1.5 z-50 hidden group-hover:block">
              <div className="bg-popover border border-border rounded-lg shadow-md px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                Manuelles Hinzufügen — demnächst verfügbar
              </div>
            </div>
          </span>
        </div>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-hidden min-h-0 p-4 sm:p-5">
        {pipelineStates.length === 0 && unassignedLeads.length === 0 ? (
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
