"use client"

import { useEffect, useState, useRef, useCallback, useContext } from "react"
import Link from "next/link"
import PipelineBoard from "@/components/boards/PipelineBoard"
import LeadImportModal from "@/components/boards/LeadImportModal"
import EmptyStateCard from "@/components/boards/EmptyStateCard"
import CRMSkeleton from "@/components/boards/CRMSkeleton"
import StatsBar from "@/components/crm/StatsBar"
import { type Lead } from "@/components/boards/LeadCard"
import { LanguageContext } from "@/lib/LanguageContext"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface PipelineState {
  id: string
  name: string
  orderIndex: number
  type: string
  leads: Lead[]
}

export default function CRMPage() {
  const { t } = useContext(LanguageContext)
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [pipelineStates, setPipelineStates] = useState<PipelineState[]>([])
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([])
  const [boardName, setBoardName] = useState("")
  const [loading, setLoading] = useState(true)
  const [showBoardDropdown, setShowBoardDropdown] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      setLoading(true)

      try {
        const boardsRes = await fetch("/api/boards")
        if (!boardsRes.ok) throw new Error("Failed to load boards")
        const boardsData = await boardsRes.json()
        const boardsList: Board[] = boardsData.boards || []

        if (!isMounted) return
        setBoards(boardsList)

        if (boardsList.length === 0) {
          setLoading(false)
          return
        }

        const lastBoardId = localStorage.getItem("crm_last_board_id")
        const validBoard = boardsList.find((b) => b.id === lastBoardId)
        const boardToUse = validBoard?.id || boardsList[0].id
        setActiveBoardId(boardToUse)

        await fetchPipeline(boardToUse, false)
      } catch (err) {
        console.error("CRM init error:", err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadInitialData()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (!activeBoardId) return
    if (loading) return

    fetchPipeline(activeBoardId, true)
    localStorage.setItem("crm_last_board_id", activeBoardId)
  }, [activeBoardId])

  const fetchPipeline = useCallback(async (boardId: string, showLoading: boolean) => {
    if (showLoading) setLoading(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/crm/pipeline?boardId=${boardId}`, {
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        console.error("Pipeline API error:", res.status, text)
        return
      }

      const data = await res.json()
      setPipelineStates(data.states || [])
      setUnassignedLeads(data.unassignedLeads || [])
      setBoardName(data.board?.name || "")
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      console.error("Pipeline fetch error:", err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const activeBoard = boards.find((b) => b.id === activeBoardId)
  const allBoardLeads = [
    ...pipelineStates.flatMap((s) => s.leads),
    ...unassignedLeads,
  ]
  const totalLeads = allBoardLeads.length

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsBar />
        <CRMSkeleton />
      </div>
    )
  }

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 bg-gray-50 dark:bg-black dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">No board yet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Create a board to start your CRM.</p>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          Create Board
        </Link>
      </div>
    )
  }

  const isEmpty = pipelineStates.length === 0 && unassignedLeads.length === 0

  return (
    <div className="space-y-6">
      <StatsBar boardLeads={allBoardLeads} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowBoardDropdown(!showBoardDropdown)}
              className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white dark:text-white hover:text-blue-700 dark:hover:text-blue-400 transition"
            >
              {boardName || activeBoard?.name || "CRM"}
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBoardDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBoardDropdown(false)} />
                <div className="absolute left-0 top-10 w-64 bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 dark:border-gray-700 shadow-lg transition-colors py-2 z-20">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wide">
                    Boards
                  </div>
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => {
                        setActiveBoardId(board.id)
                        setShowBoardDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-800 transition flex items-center justify-between ${
                        board.id === activeBoardId ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span>{board.name}</span>
                      {board.id === activeBoardId && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-800 transition"
                    >
                      Show all boards
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {totalLeads} {totalLeads === 1 ? "Lead" : "Leads"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("crm.addLead")}
          </button>
          {activeBoardId && (
            <>
              <Link
                href={`/boards/${activeBoardId}/flow`}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-black transition"
              >
                {t("nav.flowBuilder")}
              </Link>
              <Link
                href={`/boards/${activeBoardId}/settings`}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:bg-black transition"
              >
                {t("nav.settings")}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm transition-colors h-[calc(100vh-14rem)] flex flex-col">
        {isEmpty && (
          <div className="p-5">
            <EmptyStateCard boardId={activeBoardId!} onImportClick={() => setShowImportModal(true)} />
          </div>
        )}

        {activeBoardId && pipelineStates.length === 0 && unassignedLeads.length > 0 && (
          <div className="px-5 pt-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              This board has no pipeline states yet. Leads are in the unassigned area.
            </div>
          </div>
        )}

        {activeBoardId && (
          <div className="flex-1 min-h-0 p-4">
            <PipelineBoard
              states={pipelineStates}
              unassignedLeads={unassignedLeads}
              boardId={activeBoardId}
              onRefresh={() => fetchPipeline(activeBoardId, true)}
            />
          </div>
        )}
      </div>

      {activeBoardId && (
        <LeadImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          boardId={activeBoardId}
          onSuccess={() => {
            fetchPipeline(activeBoardId, true)
            setShowImportModal(false)
          }}
        />
      )}
    </div>
  )
}
