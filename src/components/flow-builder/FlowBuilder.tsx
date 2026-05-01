"use client"

import { useState, useContext } from "react"
import StateCard, { type State } from "./StateCard"
import StateForm, { type StateFormData } from "./StateForm"
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
    mission: data.mission || null,
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
  })

  const handleCreate = async (data: StateFormData) => {
    const res = await fetch(`/api/boards/${boardId}/states`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildStatePayload(data)),
    })
    if (res.ok) {
      setIsFormOpen(false)
      onChange()
    }
  }

  const handleUpdate = async (data: StateFormData) => {
    if (!data.id) return
    const res = await fetch(`/api/boards/${boardId}/states`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: data.id, ...buildStatePayload(data) }),
    })
    if (res.ok) {
      setEditingState(null)
      onChange()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/boards/${boardId}/states?stateId=${deleteTarget.id}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setDeleteTarget(null)
      onChange()
    }
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

  const openEdit = (state: State) => {
    setEditingState(state)
  }

  return (
    <div>
      {/* Prompt Generator */}
      <PromptGenerator
        boardId={boardId}
        existingStatesCount={states.length}
        onApply={handleApply}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("flowBuilder.states")}</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{states.length}</span>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("flowBuilder.addState")}
        </button>
      </div>

      {/* State Flow */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {states.map((state, index) => (
            <div key={state.id} className="flex items-center gap-4">
              <StateCard
                state={state}
                onEdit={openEdit}
                onDelete={(s) => setDeleteTarget(s)}
                nextStateName={getNextStateName(state.nextStateId)}
              />
              {index < states.length - 1 && (
                <div className="flex items-center text-gray-300 dark:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {states.length === 0 && (
            <div className="w-72 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center p-8">
              <div className="text-center">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t("flowBuilder.noStatesYet")}</p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t("flowBuilder.createFirstState")}
                </button>
                <p className="text-xs text-gray-400 mt-3">{t("flowBuilder.orUseAI")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Form */}
      <StateForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreate}
        states={states.map((s) => ({ id: s.id, name: s.name }))}
        title={t("flowBuilder.createNewState")}
        submitLabel={t("flowBuilder.create")}
      />

      {/* Edit Form */}
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
                mission: editingState.mission || "",
                rules: editingState.rules || "",
                orderIndex: editingState.orderIndex,
                nextStateId: editingState.nextStateId,
                config: editingState.config || {},
                dataToCollect: Array.isArray(editingState.dataToCollect)
                  ? (editingState.dataToCollect as string[]).join(", ")
                  : editingState.dataToCollect || "",
                completionRule: editingState.completionRule || "",
                availableTools: Array.isArray(editingState.availableTools)
                  ? editingState.availableTools
                  : [],
                behaviorMode: editingState.behaviorMode || "inherit",
                escalateOnLowConfidence: editingState.escalateOnLowConfidence ?? true,
                escalateOnOffMission: editingState.escalateOnOffMission ?? true,
                escalateOnNoReply: editingState.escalateOnNoReply ?? null,
                maxFollowups: editingState.maxFollowups ?? 3,
                followupAction: editingState.followupAction || "escalate",
              }
            : undefined
        }
        states={states.map((s) => ({ id: s.id, name: s.name }))}
        title={t("flowBuilder.editState")}
        submitLabel={t("flowBuilder.save")}
      />

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("flowBuilder.deleteState")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("flowBuilder.deleteConfirm")} <strong>{deleteTarget.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
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
