"use client"

import { useState, useContext } from "react"
import { Zap, RefreshCw } from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"

export interface GeneratedState {
  name: string
  type: string
  rules: string
  orderIndex: number
  config: Record<string, unknown>
  agentGoal?: string
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

const taClass = "w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-50"

export default function PromptGenerator({ boardId: _boardId, existingStatesCount, onApply }: PromptGeneratorProps) {
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
      if (!res.ok) { setError(data.error || t("promptGenerator.flowGenerationFailed")); return }
      if (!data.states || data.states.length === 0) { setError(t("promptGenerator.noStatesGenerated")); return }
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

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary" strokeWidth={2.5} />
        <h3 className="text-sm font-semibold text-foreground">{t("promptGenerator.aiFlowCreation")}</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{t("promptGenerator.describeFlow")}</p>

      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating || isSaving}
          className={taClass}
          rows={3}
          placeholder="Beschreibe deinen Flow… z.B. 'Erstelle einen Vertriebs-Flow für Versicherungen mit Kontakt, Qualifizierung, Angebot und Abschluss'"
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example, i) => (
            <button
              key={i}
              onClick={() => { setPrompt(example); setPreviewStates(null); setError(null) }}
              disabled={isGenerating || isSaving}
              className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 hover:bg-primary/15 transition-colors disabled:opacity-50"
            >
              {t("promptGenerator.example").replace("{n}", String(i + 1))}
            </button>
          ))}
        </div>

        {!previewStates && (
          <button
            onClick={generateFlow}
            disabled={!prompt.trim() || isGenerating || isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t("promptGenerator.generatingFlow")}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" strokeWidth={2.5} />
                {t("promptGenerator.generateFlow")}
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="mt-2 text-xs underline opacity-70 hover:opacity-100">
            {t("promptGenerator.close")}
          </button>
        </div>
      )}

      {previewStates && previewStates.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              {t("promptGenerator.preview").replace("{count}", String(previewStates.length))}
            </h4>
            <button
              onClick={() => { setPreviewStates(null); setError(null); generateFlow() }}
              disabled={isGenerating || isSaving}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              {t("promptGenerator.regenerate")}
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {previewStates.map((state, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-3 flex items-start gap-3">
                <span className="text-lg shrink-0">{typeIcons[state.type] || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{state.name}</span>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${typeColors[state.type] || typeColors.MESSAGE}`}>
                      {typeLabels[state.type] || state.type}
                    </span>
                  </div>
                  {state.config && state.type === "MESSAGE" && state.config.text != null && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                      &quot;{String(state.config.text)}&quot;
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">#{state.orderIndex}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {existingStatesCount > 0 ? (
              <>
                <button
                  onClick={() => handleApply("append")}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/15 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? t("promptGenerator.saving") : t("promptGenerator.append").replace("{count}", String(existingStatesCount))}
                </button>
                <button
                  onClick={() => handleApply("replace")}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? t("promptGenerator.saving") : t("promptGenerator.replace")}
                </button>
              </>
            ) : (
              <button
                onClick={() => handleApply("append")}
                disabled={isSaving}
                className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? t("promptGenerator.saving") : t("promptGenerator.applyFlow")}
              </button>
            )}
          </div>

          {existingStatesCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              {t("promptGenerator.appendDesc")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
