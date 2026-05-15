"use client"

import { useState, useContext } from "react"
import { Plus, ArrowRight, KanbanSquare } from "lucide-react"
import StateCard, { type State } from "./StateCard"
import StateForm, { type StateFormData, type HandoffRule } from "./StateForm"
import PromptGenerator, { type GeneratedState } from "./PromptGenerator"
import { LanguageContext } from "@/lib/LanguageContext"

interface FlowBuilderProps {
  states: State[]
  boardId: string
  onChange: () => void
}

export default function FlowBuilder({ states, boardId, onChange }: FlowBuilderProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingState, setEditingState] = useState<State | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<State | null>(null)
  const { t } = useContext(LanguageContext)

  const stateMap = new Map(states.map((s) => [s.id, s]))

  const getNextStateName = (nextStateId: string | null) => {
    if (!nextStateId) return undefined
    return stateMap.get(nextStateId)?.name
  }

  const buildStatePayload = (data: StateFormData) => ({
    name: data.name,
    type: data.type,
    rules: data.rules || null,
    orderIndex: data.orderIndex,
    nextStateId: data.nextStateId,
    config: data.config,
    dataToCollect: data.dataToCollect || "",
    completionRule: data.completionRule || null,
    availableTools: data.availableTools ?? [],
    behaviorMode: data.behaviorMode || null,
    escalateOnLowConfidence: data.escalateOnLowConfidence ?? true,
    escalateOnOffMission: data.escalateOnOffMission ?? true,
    escalateOnNoReply: data.escalateOnNoReply ?? null,
    maxFollowups: data.maxFollowups ?? 3,
    followupAction: data.followupAction || "escalate",
    allowChannelSwitch: data.allowChannelSwitch ?? true,
    agentRole: data.agentRole || null,
    agentSystemPrompt: data.agentSystemPrompt || null,
    agentGoal: data.agentGoal || null,
    handoffMode: data.handoffMode || "HYBRID",
    handoffRules: data.handoffRules ?? [],
    minAgentConfidence: data.minAgentConfidence ?? 0.7,
    nextStateOnFail: data.nextStateOnFail || null,
  })

  const handleCreate = async (data: StateFormData) => {
    const res = await fetch(`/api/boards/${boardId}/states`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildStatePayload(data)),
    })
    if (res.ok) { setIsFormOpen(false); onChange() }
  }

  const handleUpdate = async (data: StateFormData) => {
    if (!data.id) return
    const res = await fetch(`/api/boards/${boardId}/states`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.id, ...buildStatePayload(data) }),
    })
    if (res.ok) { setEditingState(null); onChange() }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/boards/${boardId}/states?stateId=${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) { setDeleteTarget(null); onChange() }
  }

  const handleApply = async (generatedStates: GeneratedState[], mode: "append" | "replace") => {
    const res = await fetch(`/api/boards/${boardId}/states/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ states: generatedStates, mode }),
    })
    if (res.ok) {
      onChange()
    } else {
      const err = await res.json().catch(() => ({ error: "Save failed" }))
      alert(err.error || "Save failed")
    }
  }

  return (
    <div>
      <PromptGenerator boardId={boardId} existingStatesCount={states.length} onApply={handleApply} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">{t("flowBuilder.states")}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">{states.length}</span>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("flowBuilder.addState")}
        </button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {states.map((state, index) => (
            <div key={state.id} className="flex items-center gap-4">
              <StateCard
                state={state}
                onEdit={(s) => setEditingState(s)}
                onDelete={(s) => setDeleteTarget(s)}
                nextStateName={getNextStateName(state.nextStateId)}
              />
              {index < states.length - 1 && (
                <ArrowRight className="w-5 h-5 text-border shrink-0" />
              )}
            </div>
          ))}

          {states.length === 0 && (
            <div className="w-72 bg-muted/30 rounded-xl border border-dashed border-border flex items-center justify-center p-8">
              <div className="text-center">
                <KanbanSquare className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground mb-2">{t("flowBuilder.noStatesYet")}</p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {t("flowBuilder.createFirstState")}
                </button>
                <p className="text-xs text-muted-foreground mt-3">{t("flowBuilder.orUseAI")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <StateForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreate}
        states={states.map((s) => ({ id: s.id, name: s.name }))}
        title={t("flowBuilder.createNewState")}
        submitLabel={t("flowBuilder.create")}
      />

      <StateForm
        isOpen={!!editingState}
        onClose={() => setEditingState(null)}
        onSubmit={handleUpdate}
        initialData={
          editingState
            ? {
                id: editingState.id,
                name: editingState.name,
                type: editingState.type,
                rules: editingState.rules || "",
                orderIndex: editingState.orderIndex,
                nextStateId: editingState.nextStateId,
                config: editingState.config || {},
                dataToCollect: Array.isArray(editingState.dataToCollect)
                  ? (editingState.dataToCollect as string[]).join(", ")
                  : String(editingState.dataToCollect || ""),
                completionRule: editingState.completionRule || "",
                availableTools: Array.isArray(editingState.availableTools) ? editingState.availableTools : [],
                behaviorMode: editingState.behaviorMode || "inherit",
                escalateOnLowConfidence: editingState.escalateOnLowConfidence ?? true,
                escalateOnOffMission: editingState.escalateOnOffMission ?? true,
                escalateOnNoReply: editingState.escalateOnNoReply ?? null,
                maxFollowups: editingState.maxFollowups ?? 3,
                followupAction: editingState.followupAction || "escalate",
                allowChannelSwitch: editingState.allowChannelSwitch ?? true,
                agentRole: editingState.agentRole || "",
                agentSystemPrompt: editingState.agentSystemPrompt || "",
                agentGoal: editingState.agentGoal || "",
                handoffMode: editingState.handoffMode || "HYBRID",
                handoffRules: Array.isArray(editingState.handoffRules)
                  ? (editingState.handoffRules as HandoffRule[])
                  : [],
                minAgentConfidence: editingState.minAgentConfidence ?? 0.7,
                nextStateOnFail: editingState.nextStateOnFail ?? null,
              }
            : undefined
        }
        states={states.map((s) => ({ id: s.id, name: s.name }))}
        title={t("flowBuilder.editState")}
        submitLabel={t("flowBuilder.save")}
      />

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border p-6 rounded-xl w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{t("flowBuilder.deleteState")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("flowBuilder.deleteConfirm")} <strong className="text-foreground">{deleteTarget.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/90 transition-colors"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
