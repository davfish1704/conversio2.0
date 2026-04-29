"use client"

import { useEffect, useState, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

export interface StateFormData {
  id?: string
  name: string
  type: string
  mission: string
  rules: string
  orderIndex: number
  nextStateId: string | null
  config: any
}

interface StateOption {
  id: string
  name: string
}

interface StateFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StateFormData) => void
  initialData?: StateFormData
  states: StateOption[]
  title: string
  submitLabel: string
}

const stateTypes = [
  { value: "AI", label: "AI", desc: "AI-powered conversation" },
  { value: "MESSAGE", label: "Message", desc: "Fixed text message" },
  { value: "TEMPLATE", label: "Template", desc: "Template from Media Manager" },
  { value: "CONDITION", label: "Condition", desc: "If/Then logic" },
  { value: "WAIT", label: "Wait", desc: "Time delay" },
]

const aiModels = [
  { value: "conversio", label: "Conversio" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
]

export default function StateForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  states,
  title,
  submitLabel,
}: StateFormProps) {
  const [form, setForm] = useState<StateFormData>({
    name: "",
    type: "MESSAGE",
    mission: "",
    rules: "",
    orderIndex: 0,
    nextStateId: null,
    config: {},
  })
  const { t } = useContext(LanguageContext)

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        config: initialData.config || {},
      })
    } else {
      setForm({
        name: "",
        type: "MESSAGE",
        mission: "",
        rules: "",
        orderIndex: states.length,
        nextStateId: null,
        config: {},
      })
    }
  }, [initialData, isOpen, states.length])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const updateConfig = (key: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      config: { ...(prev.config || {}), [key]: value },
    }))
  }

  const config = form.config || {}

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl z-50 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.name")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder={t("stateForm.namePlaceholder")}
            />
          </div>

          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("common.type")}</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {stateTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Mission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("stateForm.mission")}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("stateForm.missionDesc")}</p>
            <textarea
              value={form.mission}
              onChange={(e) => setForm({ ...form, mission: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={t("stateForm.missionPlaceholder")}
            />
          </div>

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("stateForm.rules")}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("stateForm.rulesDesc")}</p>
            <textarea
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={t("stateForm.rulesPlaceholder")}
            />
          </div>

          {/* Transition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("stateForm.nextState")}</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("stateForm.nextStateDesc")}</p>
            <select
              value={form.nextStateId || ""}
              onChange={(e) => setForm({ ...form, nextStateId: e.target.value || null })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t("stateForm.noNextState")}</option>
              {states
                .filter((s) => s.id !== form.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Type-specific configuration */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t("stateForm.typeConfig")}</h3>

            {form.type === "AI" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("stateForm.aiModel")}</label>
                  <select
                    value={config.model || "conversio"}
                    onChange={(e) => updateConfig("model", e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {aiModels.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("stateForm.temperature")}: {config.temperature ?? 0.7}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature ?? 0.7}
                    onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{t("stateForm.precise")}</span>
                    <span>{t("stateForm.creative")}</span>
                  </div>
                </div>
              </div>
            )}

            {form.type === "MESSAGE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("stateForm.fixedMessage")}</label>
                <textarea
                  value={config.text || ""}
                  onChange={(e) => updateConfig("text", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={t("stateForm.fixedMessagePlaceholder")}
                />
              </div>
            )}

            {form.type === "TEMPLATE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("stateForm.templateName")}</label>
                <input
                  type="text"
                  value={config.templateName || ""}
                  onChange={(e) => updateConfig("templateName", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("stateForm.templatePlaceholder")}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("stateForm.templateNote")}</p>
              </div>
            )}

            {form.type === "CONDITION" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("stateForm.ifThenCondition")}</label>
                <textarea
                  value={config.condition || ""}
                  onChange={(e) => updateConfig("condition", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t("stateForm.conditionPlaceholder")}
                />
              </div>
            )}

            {form.type === "WAIT" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("stateForm.waitTimeHours")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.duration || ""}
                  onChange={(e) => updateConfig("duration", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("stateForm.waitPlaceholder")}
                />
              </div>
            )}
          </div>

          {/* Order Index */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("stateForm.orderIndex")}</label>
            <input
              type="number"
              min="0"
              value={form.orderIndex}
              onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900 pb-2">
            {initialData?.id && (
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
              >
                {t("stateForm.cancel")}
              </button>
            )}
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
