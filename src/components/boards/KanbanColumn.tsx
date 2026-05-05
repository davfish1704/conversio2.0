"use client"

import { useContext } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import LeadCard, { type Lead } from "./LeadCard"
import { SortableLeadCard } from "./SortableLeadCard"
import { LanguageContext } from "@/lib/LanguageContext"

interface StateOption {
  id: string
  name: string
}

interface KanbanColumnProps {
  id: string
  name: string
  leads: Lead[]
  states: StateOption[]
  onStateChange: (leadId: string, stateId: string) => void
  onLeadClick: (lead: Lead) => void
}

export default function KanbanColumn({ id, name, leads, states, onStateChange, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const { t } = useContext(LanguageContext)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 min-w-[220px] h-full rounded-xl transition shrink-0 ${
        isOver ? "bg-blue-50/50 ring-2 ring-blue-200" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>

      {/* Lead Cards - scrollable within column */}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-h-0">
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
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400">{t("kanban.noLeadsYet")}</p>
            <p className="text-[10px] text-gray-300 mt-0.5">{t("kanban.dragHere")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
