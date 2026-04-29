"use client"

import { useState, useContext } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Phone, MessageCircle, Tag, Star } from "lucide-react"
import { type Lead } from "@/components/boards/LeadCard"
import { getInitials, getAvatarColor, formatRelativeTime } from "@/lib/utils/formatting"
import { LanguageContext } from "@/lib/LanguageContext"

type LeadStatus = "needs_reply" | "opt_in" | "waiting" | "neutral"

function getLeadStatus(lead: Lead): LeadStatus {
  if (!lead.messages || lead.messages.length === 0) return "neutral"
  const lastMsg = lead.messages[0]
  if (lastMsg.direction === "INBOUND") return "needs_reply"
  if (lead.leadScore && lead.leadScore >= 60) return "opt_in"
  return "waiting"
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; dot: string; bg: string; text: string }> = {
  needs_reply: {
    label: "Needs reply",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
  opt_in: {
    label: "Opt-in",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  waiting: {
    label: "Waiting",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  neutral: {
    label: "",
    dot: "bg-gray-300",
    bg: "bg-gray-50",
    text: "text-gray-600",
  },
}

interface ConversioLeadCardProps {
  lead: Lead
  onClick?: (lead: Lead) => void
  isDragging?: boolean
}

export function StaticConversioLeadCard({ lead, onClick }: ConversioLeadCardProps) {
  const [showActions, setShowActions] = useState(false)
  const status = getLeadStatus(lead)
  const config = STATUS_CONFIG[status]
  const { t, language } = useContext(LanguageContext)

  const score = lead.leadScore || 0
  const scoreColor = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-gray-400"

  return (
    <div
      className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
      onClick={() => onClick?.(lead)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Top row: Avatar + Name + Status */}
      <div className="flex items-start gap-2.5">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white ${getAvatarColor(
            lead.customerPhone
          )}`}
        >
          {getInitials(lead.customerName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {lead.customerName || t("crm.unknown")}
            </p>
            {score > 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-bold ${scoreColor}`}>
                <Star className="w-2.5 h-2.5 fill-current" />
                {score}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500">{lead.customerPhone}</p>
        </div>
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {lead.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600"
            >
              <Tag className="w-2 h-2" />
              {tag}
            </span>
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[9px] text-gray-400 px-1">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Status Badge */}
      {config.label && (
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${config.bg} ${config.text}`}>
            <span className={`w-1 h-1 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>
      )}

      {/* Last message preview */}
      {lead.messages[0] && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <p className="text-[11px] text-gray-600 line-clamp-1 leading-relaxed">
            {lead.messages[0].content}
          </p>
        </div>
      )}

      {/* Footer: Timestamp + Actions */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">
          {formatRelativeTime(lead.lastMessageAt, language)}
        </span>

        <div className={`flex items-center gap-0.5 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`tel:${lead.customerPhone}`, "_self")
            }}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
            title={t("crm.call")}
          >
            <Phone className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`https://wa.me/${lead.customerPhone.replace(/\D/g, "")}`, "_blank")
            }}
            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition"
            title={t("crm.whatsApp")}
          >
            <MessageCircle className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConversioLeadCard({ lead, onClick }: ConversioLeadCardProps) {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={`${isDragging ? "opacity-50 rotate-2" : ""}`}>
        <StaticConversioLeadCard lead={lead} onClick={onClick} />
      </div>
    </div>
  )
}
