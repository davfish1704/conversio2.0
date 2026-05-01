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
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {lead.customerName || t("crm.unknown")}
              </p>
              {lead.channel === "whatsapp" && (
                <svg className="w-3 h-3 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              )}
              {lead.channel === "telegram" && (
                <svg className="w-3 h-3 text-[#2AABEE] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
                </svg>
              )}
              {lead.channel === "instagram" && (
                <svg className="w-3 h-3 text-pink-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              )}
            </div>
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
