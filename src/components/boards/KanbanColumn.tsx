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
  id,
  name,
  leads,
  states,
  onStateChange,
  onLeadClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const { t } = useContext(LanguageContext)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 min-w-[220px] h-full rounded-xl transition-colors shrink-0",
        isOver && "bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      {/* Column header — shared min-height keeps all card areas aligned */}
      <div className="min-h-[52px] flex items-start justify-between gap-2 mb-2.5 px-1 shrink-0">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider leading-snug">
          {name}
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 mt-0.5">
          {leads.length}
        </span>
      </div>

      {/* Cards — always starts at same Y because header has min-h */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-0.5 min-h-0">
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
          <div className="dot-grid rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-xs text-muted-foreground">{t("kanban.noLeadsYet")}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("kanban.dragHere")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
