"use client"

import { useState, useContext } from "react"
import { getInitials, getAvatarColor, formatPhone, formatTime } from "@/lib/utils/formatting"
import { LanguageContext } from "@/lib/LanguageContext"

export interface Lead {
  id: string
  customerName: string | null
  customerPhone: string
  customerAvatar: string | null
  leadScore: number | null
  status: string
  source: string | null
  tags: string[]
  customFields: Record<string, unknown> | null
  stateHistory: unknown
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  messages: { content: string; direction: string; timestamp: string; messageType: string }[]
  currentStateId: string | null
  channel?: string
  frozen?: boolean
  aiEnabled?: boolean
  aiModel?: string | null
  notes?: string | null
}

interface StateOption {
  id: string
  name: string
}

interface LeadCardProps {
  lead: Lead
  states?: StateOption[]
  onStateChange?: (leadId: string, stateId: string) => void
  onClick?: (lead: Lead) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
}

export default function LeadCard({ lead, states, onStateChange, onClick, isDragging, dragHandleProps }: LeadCardProps) {
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
      className={`relative bg-white dark:bg-gray-900 rounded-lg border p-3 transition group ${
        isDragging
          ? "border-blue-400 shadow-lg rotate-2 opacity-90"
          : "border-gray-200 dark:border-gray-700 hover:shadow-sm hover:border-blue-300"
      } ${isUpdating ? "opacity-70" : ""}`}
    >
      {/* Drag handle + menu row */}
      <div className="flex items-center justify-between mb-2">
        <div
          {...(dragHandleProps || {})}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5"
          title={t("leadCard.drag")}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>

        {/* State dropdown */}
        {states && states.length > 0 && onStateChange && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDropdown(!showDropdown)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition"
              title={t("leadCard.changeState")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-6 z-50 w-48 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1 max-h-60 overflow-y-auto">
                  {states.map((state) => (
                    <button
                      key={state.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStateSelect(state.id)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                        state.id === lead.currentStateId ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {state.id === lead.currentStateId && (
                        <span className="inline-block w-4 mr-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      {state.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lead content - clickable */}
      <div className="cursor-pointer" onClick={() => onClick?.(lead)}>
        <div className="flex items-start gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(
              lead.customerPhone
            )}`}
          >
            {getInitials(lead.customerName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {lead.customerName || t("crm.unknown")}
            </p>
            <p className="text-xs text-gray-500">{formatPhone(lead.customerPhone)}</p>
          </div>
          {lead.leadScore ? (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                lead.leadScore >= 70
                  ? "bg-green-50 text-green-700"
                  : lead.leadScore >= 40
                    ? "bg-amber-50 text-amber-700"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              {lead.leadScore}
            </span>
          ) : null}
        </div>

        {lead.messages[0] && (
          <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{lead.messages[0].content}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(lead.lastMessageAt, language)}</p>
          </div>
        )}

        {lead.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lead.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                {tag}
              </span>
            ))}
            {lead.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded">
                +{lead.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
