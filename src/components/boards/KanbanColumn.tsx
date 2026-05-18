"use client"

import { useContext } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { SortableLeadCard } from "./SortableLeadCard"
import { type Lead } from "./LeadCard"
import { LanguageContext } from "@/lib/LanguageContext"
import { cn } from "@/lib/utils"

interface StateOption { id: string; name: string }

interface KanbanColumnProps {
  id: string
  name: string
  leads: Lead[]
  states: StateOption[]
  onStateChange: (leadId: string, stateId: string) => void
  onLeadClick: (lead: Lead) => void
}

export default function KanbanColumn({
  id, name, leads, states, onStateChange, onLeadClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const { t } = useContext(LanguageContext)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 min-w-[260px] h-full rounded-lg transition-colors shrink-0",
        isOver && "bg-primary/[0.03] ring-1 ring-primary/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1 shrink-0">
        <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">{name}</h3>
        <span className="text-[10px] tabular-nums text-text-tertiary bg-muted px-1.5 py-[1px] rounded-full font-medium">{leads.length}</span>
      </div>

      {/* Cards */}
      <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5 min-h-0">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              states={states}
              onStateChange={onStateChange}
              onClick={onLeadClick}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="dot-grid rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-text-tertiary">{t("kanban.noLeadsYet")}</p>
            <p className="text-[10px] text-text-tertiary/60 mt-0.5">{t("kanban.dragHere")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
