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

const STAGE_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
]

function getStageColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  return STAGE_COLORS[Math.abs(hash) % STAGE_COLORS.length]
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
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("w-2 h-2 rounded-full shrink-0", getStageColor(name))} />
          <h3 className="text-[11px] font-semibold text-text-primary uppercase tracking-wider truncate">{name}</h3>
        </div>
        <span className="text-[10px] tabular-nums text-text-tertiary bg-muted px-1.5 py-[1px] rounded-full font-medium shrink-0">{leads.length}</span>
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
          <div className="min-h-[120px] h-20 rounded-lg border border-dashed border-border flex items-center justify-center transition-colors">
            <p className="text-[11px] text-text-tertiary/50">{t("kanban.dragHere")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
