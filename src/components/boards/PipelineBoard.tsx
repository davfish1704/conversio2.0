"use client"

import { useState, useCallback } from "react"
import ConversioPipeline from "@/components/crm/ConversioPipeline"
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

export default function PipelineBoard({ states, unassignedLeads, boardId, onRefresh }: PipelineBoardProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const stateOptions = states.map((s) => ({ id: s.id, name: s.name }))

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

  return (
    <div className="h-full">
      <ConversioPipeline
        states={states}
        boardId={boardId}
        onLeadClick={handleLeadClick}
        onRefresh={onRefresh}
      />

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
