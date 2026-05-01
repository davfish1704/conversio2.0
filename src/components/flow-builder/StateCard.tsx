"use client"

import { useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

export interface State {
  id: string
  name: string
  type: string
  mission: string | null
  rules: string | null
  orderIndex: number
  nextStateId: string | null
  config: any
  dataToCollect?: any
  completionRule?: string | null
  availableTools?: string[]
  behaviorMode?: string | null
  escalateOnLowConfidence?: boolean
  escalateOnOffMission?: boolean
  escalateOnNoReply?: number | null
  maxFollowups?: number
  followupAction?: string
}

const typeColors: Record<string, string> = {
  AI: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700",
  MESSAGE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  TEMPLATE: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  CONDITION: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  WAIT: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600",
}

const typeLabels: Record<string, string> = {
  AI: "AI",
  MESSAGE: "Message",
  TEMPLATE: "Template",
  CONDITION: "Condition",
  WAIT: "Wait",
}

const typeIcons: Record<string, string> = {
  AI: "🤖",
  MESSAGE: "💬",
  TEMPLATE: "📋",
  CONDITION: "🔀",
  WAIT: "⏱️",
}

interface StateCardProps {
  state: State
  onEdit: (state: State) => void
  onDelete: (state: State) => void
  nextStateName?: string
}

export default function StateCard({ state, onEdit, onDelete, nextStateName }: StateCardProps) {
  const { t } = useContext(LanguageContext)
  const config = state.config || {}

  return (
    <div className="w-72 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col hover:shadow-md transition-shadow shrink-0">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeIcons[state.type] || "📦"}</span>
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{state.name}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${
                  typeColors[state.type] || typeColors.MESSAGE
                }`}
              >
                {typeLabels[state.type] || state.type}
              </span>
              <span className="text-xs text-gray-400">#{state.orderIndex}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(state)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
              title={t("stateCard.edit")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={() => onDelete(state)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              title={t("stateCard.delete")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 space-y-3">
        {state.mission ? (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("stateCard.mission")}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{state.mission}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">{t("stateCard.noMissionDefined")}</p>
        )}

        {/* Config Preview */}
        {state.type === "AI" && config.model && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("stateCard.model")}:</span>
            <span className="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{config.model}</span>
          </div>
        )}
        {state.type === "MESSAGE" && config.text && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t("stateCard.text")}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{config.text}</p>
          </div>
        )}
        {state.type === "WAIT" && config.duration && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("stateCard.waitTime")}:</span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{config.duration}h</span>
          </div>
        )}

        {/* Transition */}
        {nextStateName && (
          <div className="pt-2 border-t border-gray-50 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span>{t("stateCard.nextState")}:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{nextStateName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
