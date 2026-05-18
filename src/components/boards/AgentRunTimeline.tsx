"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import AgentRunDetailDrawer from "./AgentRunDetailDrawer"

interface TimelineRun {
  id: string
  createdAt: string
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costCents: number
  latencyMs: number
  outcome: string
  toolCallsMade: unknown
  handoffProposed: boolean
  handoffReason: string | null
  agentConfidence: number | null
  targetStateId: string | null
  errorMessage: string | null
  state: { id: string; name: string; agentRole: string | null } | null
  conversation: { id: string; channel: string } | null
}

interface Props {
  leadId: string
}

function fmtCost(cents: number) {
  return `$${(cents / 100).toFixed(4)}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const OUTCOME_STYLES: Record<string, { dot: string; bg: string; label: string }> = {
  SUCCESS_CONTINUE: {
    dot: "bg-green-500",
    bg: "border-green-500/15 hover:bg-green-500/5",
    label: "success",
  },
  SUCCESS_HANDOFF: {
    dot: "bg-blue-500",
    bg: "border-blue-500/15 hover:bg-blue-500/5",
    label: "handoff",
  },
  HANDOFF_BLOCKED: {
    dot: "bg-amber-500",
    bg: "border-amber-500/15 hover:bg-amber-500/5",
    label: "blocked",
  },
  TOOL_EXECUTION_FAILED: {
    dot: "bg-red-500",
    bg: "border-red-500/15 hover:bg-red-500/5",
    label: "error",
  },
  LLM_ERROR: {
    dot: "bg-red-500",
    bg: "border-red-500/15 hover:bg-red-500/5",
    label: "error",
  },
  ESCALATED: {
    dot: "bg-purple-500",
    bg: "border-purple-500/15 hover:bg-purple-500/5",
    label: "escalated",
  },
}

function getOutcomeStyle(outcome: string) {
  return OUTCOME_STYLES[outcome] ?? { dot: "bg-muted-foreground", bg: "border-border hover:bg-muted/30", label: outcome.toLowerCase() }
}

function SkeletonCard() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-[1px] shrink-0 bg-border" />
      <div className="flex-1 space-y-2 py-2">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="flex gap-2">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  )
}

export default function AgentRunTimeline({ leadId }: Props) {
  const [runs, setRuns] = useState<TimelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const fetchRuns = useCallback(async (cursorVal?: string) => {
    try {
      const params = new URLSearchParams({ limit: "50" })
      if (cursorVal) params.set("cursor", cursorVal)
      const res = await fetch(`/api/crm/leads/${leadId}/agent-runs?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      return data as { runs: TimelineRun[]; nextCursor: string | null }
    } catch (e) {
      throw e
    }
  }, [leadId])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchRuns()
      .then((data) => {
        setRuns(data.runs)
        setCursor(data.nextCursor)
        setHasMore(data.nextCursor != null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [fetchRuns])

  const loadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await fetchRuns(cursor)
      setRuns((prev) => [...prev, ...data.runs])
      setCursor(data.nextCursor)
      setHasMore(data.nextCursor != null)
    } catch {
      // silent
    } finally {
      setLoadingMore(false)
    }
  }

  const toolCallPreview = (tc: unknown) => {
    if (!Array.isArray(tc) || tc.length === 0) return null
    const names = tc.slice(0, 3).map((t: { name?: string }) => t.name ?? "?").join(", ")
    const extra = tc.length > 3 ? ` +${tc.length - 3}` : ""
    return `${names}${extra}`
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <p className="text-sm text-destructive font-medium">Fehler beim Laden</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button onClick={() => window.location.reload()} className="text-xs text-primary hover:underline mt-1">
          Erneut laden
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-0 bottom-0 w-[1px] bg-border" />

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-medium">No AI runs yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">KI-Interaktionen erscheinen hier, sobald der Sub-Agent aktiv wird</p>
          </div>
        ) : (
          <div className="space-y-1">
            {runs.map((run, idx) => {
              const style = getOutcomeStyle(run.outcome)
              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={cn(
                    "w-full text-left flex gap-3 p-3 rounded-lg border border-transparent transition-colors",
                    style.bg,
                  )}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0 pt-1">
                    <div className={cn("w-[15px] h-[15px] rounded-full border-2 border-background z-10", style.dot)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-muted-foreground">{fmtTime(run.createdAt)}</span>
                      {run.state && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-foreground rounded-md border border-border">
                          {run.state.name}
                        </span>
                      )}
                      {run.state?.agentRole && (
                        <span className="text-[10px] text-muted-foreground">{run.state.agentRole}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className={cn(
                        "font-medium",
                        run.outcome === "SUCCESS_CONTINUE" && "text-green-500",
                        run.outcome === "SUCCESS_HANDOFF" && "text-blue-500",
                        (run.outcome === "LLM_ERROR" || run.outcome === "TOOL_EXECUTION_FAILED") && "text-red-500",
                        run.outcome === "ESCALATED" && "text-purple-500",
                      )}>
                        {style.label}
                      </span>
                      <span>{fmtCost(run.costCents)}</span>
                      <span>{fmtTokens(run.totalTokens)} tok</span>
                      <span>{run.latencyMs}ms</span>
                    </div>

                    {Array.isArray(run.toolCallsMade) && run.toolCallsMade.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(run.toolCallsMade as Array<{ name: string }>).slice(0, 3).map((tc, i) => (
                          <span key={i} className="px-1.5 py-[1px] text-[10px] font-mono bg-primary/5 text-primary rounded border border-primary/10">
                            {tc.name}
                          </span>
                        ))}
                        {run.toolCallsMade.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{run.toolCallsMade.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}

            {hasMore && (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-xs font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Lädt..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AgentRunDetailDrawer
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </>
  )
}
