"use client"

import { useState, useContext } from "react"
import { GripVertical, ChevronDown, Check } from "lucide-react"
import { getInitials, getAvatarColor, formatPhone, formatTime } from "@/lib/utils/formatting"
import { LanguageContext } from "@/lib/LanguageContext"
import { cn } from "@/lib/utils"

export interface Lead {
  id: string
  name: string | null
  phone: string | null
  avatar: string | null
  leadScore: number | null
  status?: string
  source: string | null
  tags: string[]
  customData: Record<string, unknown> | null
  stateHistory: unknown
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  messages: { content: string; direction: string; timestamp: string; messageType: string }[]
  currentStateId: string | null
  channel?: string
  frozen?: boolean
  aiEnabled?: boolean
  notes?: string | null
  conversationId?: string | null
}

interface StateOption { id: string; name: string }

interface LeadCardProps {
  lead: Lead
  states?: StateOption[]
  onStateChange?: (leadId: string, stateId: string) => void
  onClick?: (lead: Lead) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
  "data-lead-id"?: string
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" /></svg>,
  telegram: <svg className="w-3 h-3 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" /></svg>,
}

export default function LeadCard({
  lead, states, onStateChange, onClick, isDragging, dragHandleProps, "data-lead-id": dataLeadId,
}: LeadCardProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { t, language } = useContext(LanguageContext)

  const handleStateSelect = async (stateId: string) => {
    setShowDropdown(false)
    if (stateId === lead.currentStateId) return
    setIsUpdating(true)
    await onStateChange?.(lead.id, stateId)
    setIsUpdating(false)
  }

  return (
    <div
      data-lead-id={dataLeadId}
      className={cn(
        "relative bg-card rounded-lg border transition-all duration-100 group",
        isDragging
          ? "border-primary/40 shadow-lg rotate-1 opacity-95 scale-[1.02] z-50"
          : "border-border hover:border-border/80 hover:shadow-xs",
        isUpdating && "opacity-60 pointer-events-none"
      )}
    >
      <div className="p-2.5">
        {/* Top bar: drag + state */}
        <div className="flex items-center justify-between mb-2">
          <div
            {...(dragHandleProps || {})}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors -ml-0.5"
          >
            <GripVertical className="w-3 h-3" />
          </div>

          {states && states.length > 0 && onStateChange && (
            <div className="relative opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-100">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown) }}
                className="flex items-center gap-1 px-1.5 py-[2px] text-[10px] text-text-tertiary hover:text-text-primary hover:bg-muted rounded transition-colors"
                title="State wechseln"
              >
                <span className="truncate max-w-[70px]">
                  {states.find((s) => s.id === lead.currentStateId)?.name ?? "State"}
                </span>
                <ChevronDown className="w-2.5 h-2.5 shrink-0" />
              </button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 top-6 z-50 w-40 bg-popover border border-border rounded-lg shadow-md py-1 max-h-48 overflow-y-auto animate-scale-in">
                    {states.map((state) => (
                      <button
                        key={state.id}
                        onClick={(e) => { e.stopPropagation(); handleStateSelect(state.id) }}
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                          state.id === lead.currentStateId
                            ? "text-primary font-medium bg-primary/5"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        {state.id === lead.currentStateId
                          ? <Check className="w-3 h-3 shrink-0" />
                          : <span className="w-3 shrink-0" />}
                        {state.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Lead info */}
        <div className="cursor-pointer" onClick={() => onClick?.(lead)}>
          <div className="flex items-start gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0",
              getAvatarColor(lead.phone || lead.id)
            )}>
              {getInitials(lead.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-text-primary truncate">
                  {lead.name || t("crm.unknown")}
                </p>
                {lead.channel && CHANNEL_ICONS[lead.channel]}
              </div>
              <p className="text-[10px] text-text-tertiary mt-[1px]">{formatPhone(lead.phone || "")}</p>
            </div>
            {lead.leadScore ? (
              <span className={cn(
                "text-[10px] font-medium px-1 py-[1px] rounded tabular-nums shrink-0",
                lead.leadScore >= 70 ? "bg-success/10 text-success" :
                lead.leadScore >= 40 ? "bg-warning/10 text-warning" : "bg-muted text-text-tertiary"
              )}>
                {lead.leadScore}
              </span>
            ) : null}
          </div>

          {/* Last message */}
          {lead.messages[0] && (
            <div className="mt-2 pt-1.5 border-t border-border">
              <p className="text-[10px] text-text-tertiary line-clamp-1 leading-relaxed">{lead.messages[0].content}</p>
              <p className="text-[9px] text-text-tertiary/60 mt-[1px]">
                {formatTime(lead.lastMessageAt, language)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
