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
import PipelineStage from "./PipelineStage"
import { StaticConversioLeadCard } from "./ConversioLeadCard"
import { type Lead } from "@/components/boards/LeadCard"

interface PipelineState {
  id: string
  name: string
  orderIndex: number
  type: string
  leads: Lead[]
}

interface Props {
  states: PipelineState[]
  boardId: string
  onLeadClick?: (lead: Lead) => void
  onRefresh?: () => void
}

export default function ConversioPipeline({ states: initialStates, boardId, onLeadClick, onRefresh }: Props) {
  const [states, setStates] = useState<PipelineState[]>(initialStates)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  // Sync local state when initialStates change significantly
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const leadId = event.active.id as string
    setIsDragging(true)
    for (const state of states) {
      const lead = state.leads.find((l) => l.id === leadId)
      if (lead) {
        setActiveLead(lead)
        break
      }
    }
  }, [states])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)
    setIsDragging(false)

    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    // Find target state
    let targetStateId: string | null = null
    for (const state of states) {
      if (state.id === overId) {
        targetStateId = state.id
        break
      }
      if (state.leads.some((l) => l.id === overId)) {
        targetStateId = state.id
        break
      }
    }

    if (!targetStateId) return

    // Find source state and lead
    let sourceStateId: string | null = null
    let movedLead: Lead | null = null

    for (const state of states) {
      const lead = state.leads.find((l) => l.id === leadId)
      if (lead) {
        sourceStateId = state.id
        movedLead = lead
        break
      }
    }

    if (!movedLead || sourceStateId === targetStateId) return

    // Optimistic update
    setStates((prev) =>
      prev.map((state) => {
        if (state.id === sourceStateId) {
          return { ...state, leads: state.leads.filter((l) => l.id !== leadId) }
        }
        if (state.id === targetStateId) {
          return { ...state, leads: [...state.leads, { ...movedLead!, currentStateId: targetStateId }] }
        }
        return state
      })
    )

    // Abort previous request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch("/api/crm/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          conversationId: leadId,
          targetStateId,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Update failed: ${res.status}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      console.error("Drag update failed:", error)
      // Revert
      setStates((prev) =>
        prev.map((state) => {
          if (state.id === sourceStateId) {
            return { ...state, leads: [...state.leads, movedLead!] }
          }
          if (state.id === targetStateId) {
            return { ...state, leads: state.leads.filter((l) => l.id !== leadId) }
          }
          return state
        })
      )
    }
  }, [states, onRefresh])

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto h-full min-h-[400px] pb-2">
          {states.map((state) => (
            <PipelineStage
              key={state.id}
              id={state.id}
              name={state.name}
              leads={state.leads}
              onLeadClick={onLeadClick || (() => {})}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-2 opacity-90">
              <StaticConversioLeadCard lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
