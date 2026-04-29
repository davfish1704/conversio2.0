"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import LeadCard, { type Lead } from "./LeadCard"

interface StateOption {
  id: string
  name: string
}

interface SortableLeadCardProps {
  lead: Lead
  states: StateOption[]
  onStateChange: (leadId: string, stateId: string) => void
  onClick: (lead: Lead) => void
}

export function SortableLeadCard({ lead, states, onStateChange, onClick }: SortableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <LeadCard
        lead={lead}
        states={states}
        onStateChange={onStateChange}
        onClick={onClick}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
