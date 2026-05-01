"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import KanbanColumn from "./KanbanColumn"
import LeadDrawer from "./LeadDrawer"
import { type Lead } from "./LeadCard"

interface PipelineState {
  id: string
  name: string
  orderIndex: number
  type: string
  leads: Lead[]
}

interface PipelineBoardProps {
  states: PipelineState[]
  unassignedLeads: Lead[]
  boardId: string
  onRefresh: () => void
}

export default function PipelineBoard({ states: initialStates, boardId, onRefresh }: PipelineBoardProps) {
  const [states, setStates] = useState<PipelineState[]>(initialStates)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  useEffect(() => {
    setStates((prev) => {
      if (
        prev.length !== initialStates.length ||
        prev[0]?.id !== initialStates[0]?.id ||
        prev.some((s, i) => initialStates[i] && s.leads.length !== initialStates[i].leads.length)
      ) {
        return initialStates
      }
      return prev
    })
  }, [initialStates])

  const stateOptions = states.map((s) => ({ id: s.id, name: s.name }))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleLeadClick = useCallback((lead: Lead) => {
    setSelectedLead(lead)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setSelectedLead(null)
  }, [])

  const handleStateChange = useCallback(async (leadId: string, stateId: string) => {
    try {
      const res = await fetch(`/api/conversations/${leadId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateId, source: "manual" }),
      })
      if (!res.ok) throw new Error("State update failed")
      onRefresh()
    } catch (err) {
      console.error("State change error:", err)
    }
  }, [onRefresh])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const leadId = event.active.id as string
    for (const state of states) {
      const lead = state.leads.find((l) => l.id === leadId)
      if (lead) { setActiveLead(lead); break }
    }
  }, [states])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)
    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    let targetStateId: string | null = null
    for (const state of states) {
      if (state.id === overId) { targetStateId = state.id; break }
      if (state.leads.some((l) => l.id === overId)) { targetStateId = state.id; break }
    }
    if (!targetStateId) return

    let sourceStateId: string | null = null
    let movedLead: Lead | null = null
    for (const state of states) {
      const lead = state.leads.find((l) => l.id === leadId)
      if (lead) { sourceStateId = state.id; movedLead = lead; break }
    }
    if (!movedLead || sourceStateId === targetStateId) return

    setStates((prev) =>
      prev.map((state) => {
        if (state.id === sourceStateId) return { ...state, leads: state.leads.filter((l) => l.id !== leadId) }
        if (state.id === targetStateId) return { ...state, leads: [...state.leads, { ...movedLead!, currentStateId: targetStateId! }] }
        return state
      })
    )

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/crm/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ conversationId: leadId, targetStateId }),
      })
      if (!res.ok) throw new Error(`Update failed: ${res.status}`)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      console.error("Drag update failed:", error)
      setStates((prev) =>
        prev.map((state) => {
          if (state.id === sourceStateId) return { ...state, leads: [...state.leads, movedLead!] }
          if (state.id === targetStateId) return { ...state, leads: state.leads.filter((l) => l.id !== leadId) }
          return state
        })
      )
    }
  }, [states])

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto min-h-[400px] pb-2">
          {states.map((state) => (
            <KanbanColumn
              key={state.id}
              id={state.id}
              name={state.name}
              leads={state.leads}
              states={stateOptions}
              onStateChange={handleStateChange}
              onLeadClick={handleLeadClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-2 opacity-90 w-72">
              <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200 text-sm font-medium text-gray-900">
                {activeLead.name ?? activeLead.phone}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LeadDrawer
        lead={selectedLead}
        states={stateOptions}
        boardId={boardId}
        onClose={handleCloseDrawer}
        onUpdate={onRefresh}
      />
    </div>
  )
}
