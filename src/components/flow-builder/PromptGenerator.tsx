"use client"

import { useState, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

export interface GeneratedState {
  name: string
  type: string
  mission: string
  rules: string
  orderIndex: number
  config: any
}

interface PromptGeneratorProps {
  boardId: string
  existingStatesCount: number
  onApply: (states: GeneratedState[], mode: "append" | "replace") => void
}

const EXAMPLE_PROMPTS = [
  "Create a sales flow for real estate: Contact -> Qualification -> Viewing -> Offer -> Closing",
  "Customer support flow: Greeting -> Problem identification -> Solution -> Feedback",
  "Onboarding flow for SaaS: Welcome -> Create profile -> Product tour -> First action",
  "Sales flow for high-priced consulting with 5 steps including qualification and follow-up",
  "Support flow with escalation to human agent when the problem is not solved",
]

const typeColors: Record<string, string> = {
  AI: "bg-purple-50 text-purple-700 border-purple-200",
  MESSAGE: "bg-blue-50 text-blue-700 border-blue-200",
  TEMPLATE: "bg-green-50 text-green-700 border-green-200",
  CONDITION: "bg-amber-50 text-amber-700 border-amber-200",
  WAIT: "bg-gray-50 text-gray-700 border-gray-200",
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

export default function PromptGenerator({ boardId, existingStatesCount, onApply }: PromptGeneratorProps) {
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewStates, setPreviewStates] = useState<GeneratedState[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { t } = useContext(LanguageContext)

  const generateFlow = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setError(null)
    setPreviewStates(null)

    try {
      const res = await fetch("/api/ai/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t("promptGenerator.flowGenerationFailed"))
        return
      }

      if (!data.states || data.states.length === 0) {
        setError(t("promptGenerator.noStatesGenerated"))
        return
      }

      setPreviewStates(data.states)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("promptGenerator.networkError"))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = async (mode: "append" | "replace") => {
    if (!previewStates || previewStates.length === 0) return
    setIsSaving(true)
    try {
      await onApply(previewStates, mode)
      setPreviewStates(null)
      setPrompt("")
    } finally {
      setIsSaving(false)
    }
  }

  const useExample = (example: string) => {
    setPrompt(example)
    setPreviewStates(null)
    setError(null)
  }

  const handleRegenerate = () => {
    setPreviewStates(null)
    setError(null)
    generateFlow()
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("promptGenerator.aiFlowCreation")}</h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {t("promptGenerator.describeFlow")}
      </p>

      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating || isSaving}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm disabled:opacity-50"
          rows={3}
          placeholder="Describe your flow... e.g. 'Create a sales flow for real estate with contact, qualification, viewing, offer and closing'"
        />

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example, i) => (
            <button
              key={i}
              onClick={() => useExample(example)}
              disabled={isGenerating || isSaving}
              className="text-xs text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg px-2.5 py-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition disabled:opacity-50"
            >
              {t("promptGenerator.example").replace("{n}", String(i + 1))}
            </button>
          ))}
        </div>

        {/* Generate button */}
        {!previewStates && (
          <button
            onClick={generateFlow}
            disabled={!prompt.trim() || isGenerating || isSaving}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("promptGenerator.generatingFlow")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t("promptGenerator.generateFlow")}
              </>
            )}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            {t("promptGenerator.close")}
          </button>
        </div>
      )}

      {/* Preview */}
      {previewStates && previewStates.length > 0 && (
        <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t("promptGenerator.preview").replace("{count}", String(previewStates.length))}
            </h4>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || isSaving}
              className="text-xs text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 underline disabled:opacity-50"
            >
              {t("promptGenerator.regenerate")}
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {previewStates.map((state, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-start gap-3"
              >
                <span className="text-lg shrink-0">{typeIcons[state.type] || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{state.name}</span>
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                        typeColors[state.type] || typeColors.MESSAGE
                      }`}
                    >
                      {typeLabels[state.type] || state.type}
                    </span>
                  </div>
                  {state.mission && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{state.mission}</p>
                  )}
                  {state.config && state.type === "MESSAGE" && state.config.text && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 italic">
                      "{state.config.text}"
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">#{state.orderIndex}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {existingStatesCount > 0 ? (
              <>
                <button
                  onClick={() => handleApply("append")}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 disabled:opacity-50 transition"
                >
                  {isSaving ? t("promptGenerator.saving") : t("promptGenerator.append").replace("{count}", String(existingStatesCount))}
                </button>
                <button
                  onClick={() => handleApply("replace")}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {isSaving ? t("promptGenerator.saving") : t("promptGenerator.replace")}
                </button>
              </>
            ) : (
              <button
                onClick={() => handleApply("append")}
                disabled={isSaving}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {isSaving ? t("promptGenerator.saving") : t("promptGenerator.applyFlow")}
              </button>
            )}
          </div>

          {existingStatesCount > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              {t("promptGenerator.appendDesc")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
