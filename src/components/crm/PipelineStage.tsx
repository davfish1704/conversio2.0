"use client"

import { useContext } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, MoreHorizontal } from "lucide-react"
import ConversioLeadCard from "./ConversioLeadCard"
import { type Lead } from "@/components/boards/LeadCard"
import { LanguageContext } from "@/lib/LanguageContext"

interface PipelineStageProps {
  id: string
  name: string
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  color?: string
}

const STAGE_COLORS: Record<string, string> = {
  "NEU": "bg-gray-50/80",
  "KONTAKT": "bg-blue-50/40",
  "BERATUNG": "bg-amber-50/40",
  "ANGEBOT": "bg-violet-50/40",
  "ABSCHLUSS": "bg-emerald-50/40",
  "ABGESAGT": "bg-rose-50/40",
}

const STAGE_BORDER_COLORS: Record<string, string> = {
  "NEU": "border-gray-200",
  "KONTAKT": "border-blue-200",
  "BERATUNG": "border-amber-200",
  "ANGEBOT": "border-violet-200",
  "ABSCHLUSS": "border-emerald-200",
  "ABGESAGT": "border-rose-200",
}

export default function PipelineStage({ id, name, leads, onLeadClick }: PipelineStageProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const bgColor = STAGE_COLORS[name.toUpperCase()] || "bg-gray-50/50"
  const borderColor = STAGE_BORDER_COLORS[name.toUpperCase()] || "border-gray-200"
  const { t } = useContext(LanguageContext)

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 rounded-xl border ${borderColor} ${bgColor} transition-all flex flex-col max-h-full ${
        isOver ? "ring-2 ring-blue-300 bg-blue-50/30" : ""
      }`}
    >
      {/* Stage Header */}
      <div className="flex items-center justify-between px-3.5 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-700 tracking-wide uppercase">{name}</h3>
          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
            {leads.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="p-1 text-gray-300 hover:text-gray-500 hover:bg-white/60 rounded-md transition">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-gray-300 hover:text-gray-500 hover:bg-white/60 rounded-md transition">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Lead Cards - Scrollable */}
      <div className="px-2.5 pb-3 space-y-2 overflow-y-auto flex-1 min-h-0">
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <ConversioLeadCard key={lead.id} lead={lead} onClick={onLeadClick} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {leads.length === 0 && !isOver && (
          <div className="rounded-lg border-2 border-dashed border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/40 p-5 text-center">
            <p className="text-xs text-gray-400 font-medium">{t("pipelineStage.noLeadsYet")}</p>
            <p className="text-[10px] text-gray-300 mt-1">{t("pipelineStage.dragHere")}</p>
          </div>
        )}

        {/* Drag Overlay placeholder */}
        {isOver && leads.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-5 text-center">
            <p className="text-xs text-blue-400 font-medium">{t("pipelineStage.dropHere")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
