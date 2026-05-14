"use client"

import { useContext } from "react"
import { Pencil, Trash2, ArrowRight } from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"

export interface State {
  id: string
  name: string
  type: string
  mission: string | null
  rules: string | null
  orderIndex: number
  nextStateId: string | null
  config: Record<string, unknown> | null
  dataToCollect?: unknown
  completionRule?: string | null
  availableTools?: string[]
  behaviorMode?: string | null
  escalateOnLowConfidence?: boolean
  escalateOnOffMission?: boolean
  escalateOnNoReply?: number | null
  maxFollowups?: number
  followupAction?: string
  allowChannelSwitch?: boolean
  // Sub-Agent fields
  agentRole?: string | null
  agentSystemPrompt?: string | null
  agentGoal?: string | null
  handoffMode?: string
  handoffRules?: unknown
  minAgentConfidence?: number
  nextStateOnFail?: string | null
}

const typeColors: Record<string, string> = {
  AI:        "bg-primary/10 text-primary border-primary/20",
  MESSAGE:   "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700/50",
  TEMPLATE:  "bg-success/10 text-success border-success/20",
  CONDITION: "bg-warning/15 text-warning border-warning/20",
  WAIT:      "bg-muted text-muted-foreground border-border",
}

const typeLabels: Record<string, string> = {
  AI: "AI", MESSAGE: "Message", TEMPLATE: "Template", CONDITION: "Condition", WAIT: "Wait",
}

const typeIcons: Record<string, string> = {
  AI: "🤖", MESSAGE: "💬", TEMPLATE: "📋", CONDITION: "🔀", WAIT: "⏱️",
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
    <div className="w-72 bg-card rounded-xl border border-border flex flex-col hover:shadow-md transition-shadow shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{typeIcons[state.type] || "📦"}</span>
              <h3 className="font-semibold text-foreground truncate">{state.name}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${typeColors[state.type] || typeColors.MESSAGE}`}>
                {typeLabels[state.type] || state.type}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">#{state.orderIndex}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(state)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title={t("stateCard.edit")}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(state)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title={t("stateCard.delete")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-3">
        {state.mission ? (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t("stateCard.mission")}</p>
            <p className="text-sm text-foreground line-clamp-3">{state.mission}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("stateCard.noMissionDefined")}</p>
        )}

        {state.type === "AI" && config.model != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("stateCard.model")}:</span>
            <span className="text-xs text-foreground bg-muted px-2 py-0.5 rounded">{String(config.model)}</span>
          </div>
        )}
        {state.type === "MESSAGE" && config.text != null && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{t("stateCard.text")}</p>
            <p className="text-sm text-foreground line-clamp-2">{String(config.text)}</p>
          </div>
        )}
        {state.type === "WAIT" && config.duration != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("stateCard.waitTime")}:</span>
            <span className="text-xs text-foreground">{String(config.duration)}h</span>
          </div>
        )}

        {nextStateName && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{t("stateCard.nextState")}:</span>
              <span className="font-medium text-foreground">{nextStateName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
