"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import BoardNav from "@/components/boards/BoardNav"
import AgentRunDetailDrawer from "@/components/boards/AgentRunDetailDrawer"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/ThemeContext"

interface StatsData {
  total: number
  totalCost: number
  totalTokens: number
  avgLatency: number
  handoffSuccessRate: number | null
  byState: Array<{
    stateId: string
    stateName: string
    total: number
    success: number
    handoff: number
    error: number
    totalCost: number
    avgLatency: number
    totalTokens: number
    failureRate: number
    handoffRate: number
  }>
  recentFailures: Array<{
    id: string
    outcome: string
    errorMessage: string | null
    createdAt: string
    stateName: string | null
    channel: string | null
  }>
}

const SINCE_OPTIONS = [
  { value: "24h", label: "24h" },
  { value: "7d",  label: "7d" },
  { value: "30d", label: "30d" },
] as const

function fmtCost(cents: number) {
  return `$${(cents / 100).toFixed(4)}`
}

function fmtToken(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

type SortKey = "total" | "totalCost" | "failureRate" | "avgLatency" | "totalTokens"
type SortDir = "asc" | "desc"

const OUTCOME_DOT: Record<string, string> = {
  LLM_ERROR: "bg-red-500",
  TOOL_EXECUTION_FAILED: "bg-red-500",
  HANDOFF_BLOCKED: "bg-amber-500",
  ESCALATED: "bg-purple-500",
}

function SkeletonStatCard() {
  return <div className="bg-card rounded-xl border border-border p-5 space-y-2 animate-pulse">
    <div className="h-3 bg-muted rounded w-16" />
    <div className="h-7 bg-muted rounded w-24" />
    <div className="h-3 bg-muted rounded w-20" />
  </div>
}

export default function BoardInsightsPage() {
  const { id } = useParams() as { id: string }
  const { theme } = useTheme()
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [since, setSince] = useState<string>("7d")
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const gridColor = theme === "dark" ? "#2a2d3a" : "#e5e7eb"
  const tickColor = theme === "dark" ? "#6b7280" : "#9ca3af"
  const barFill = theme === "dark" ? "#5b8dee" : "#3b82f6"
  const tooltipStyle = theme === "dark"
    ? { borderRadius: "8px", border: "1px solid #2a2d3a", backgroundColor: "#1a1d2e", color: "#f0f1f5", fontSize: "12px" }
    : { borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/crm/boards/${id}/agent-runs/stats?since=${since}`)
      .then((res) => { if (!res.ok) throw new Error("Failed"); return res.json() })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, since])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/crm/boards/${id}/agent-runs/stats?since=${since}`)
        .then((res) => { if (res.ok) return res.json() })
        .then((d) => { if (d) setData(d) })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [id, since])

  const chartData = useMemo(() => {
    if (!data?.byState) return []
    return data.byState.slice(0, 10).map((s) => ({
      name: s.stateName.length > 15 ? s.stateName.slice(0, 15) + "…" : s.stateName,
      runs: s.total,
      failures: s.error,
    }))
  }, [data])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => d === "desc" ? "asc" : "desc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const sortedStates = useMemo(() => {
    if (!data?.byState) return []
    return [...data.byState].sort((a, b) => {
      const mul = sortDir === "desc" ? 1 : -1
      return (a[sortKey] - b[sortKey]) * mul
    })
  }, [data, sortKey, sortDir])

  const selectClass = "px-3 py-1.5 text-sm border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">AI Insights</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Sub-Agent Performance & Analytics</p>
            </div>
            <div className="flex items-center gap-2">
              {SINCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSince(opt.value)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    since === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <BoardNav />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        ) : !data ? (
          <div className="text-center py-24 text-muted-foreground text-sm">Keine Daten verfügbar.</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs text-muted-foreground">Total AI Runs</p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{data.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">im ausgewählten Zeitraum</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{fmtCost(data.totalCost * 100)}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtToken(data.totalTokens)} Tokens</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                  {data.avgLatency > 1000
                    ? `${(data.avgLatency / 1000).toFixed(1)}s`
                    : `${data.avgLatency}ms`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">pro AI Call</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs text-muted-foreground">Handoff Success Rate</p>
                <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                  {data.handoffSuccessRate != null ? `${data.handoffSuccessRate}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">erfolgreiche Übergaben</p>
              </div>
            </div>

            {/* Chart: Runs by State */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Runs by State (Top 10)</h3>
              {chartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Keine Daten</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: tickColor }} width={40} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="runs" fill={barFill} radius={[3, 3, 0, 0]} name="Total Runs" />
                    <Bar dataKey="failures" fill="#ef4444" radius={[3, 3, 0, 0]} name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* State Performance Table */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">State Performance</h3>
              {sortedStates.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Keine Daten</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="pb-2 font-medium">State</th>
                        {([{ key: "total", label: "Runs" }, { key: "totalCost", label: "Cost" }, { key: "totalTokens", label: "Tokens" }, { key: "avgLatency", label: "Avg Latency" }, { key: "failureRate", label: "Failure Rate" }] as const).map((col) => (
                          <th
                            key={col.key}
                            onClick={() => toggleSort(col.key as SortKey)}
                            className="pb-2 font-medium text-right cursor-pointer hover:text-foreground transition-colors"
                          >
                            {col.label}
                            {sortKey === col.key && (
                              <span className="ml-1 text-primary">{sortDir === "desc" ? "↓" : "↑"}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedStates.map((s) => (
                        <tr key={s.stateId} className="text-foreground hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 text-xs font-medium">{s.stateName}</td>
                          <td className="py-2.5 text-right tabular-nums">{s.total}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtCost(s.totalCost * 100)}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtToken(s.totalTokens)}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {s.avgLatency > 1000 ? `${(s.avgLatency / 1000).toFixed(1)}s` : `${s.avgLatency}ms`}
                          </td>
                          <td className="py-2.5 text-right">
                            <span className={cn(
                              "tabular-nums font-medium",
                              s.failureRate > 20 ? "text-red-500" : s.failureRate > 5 ? "text-amber-500" : "text-green-500"
                            )}>
                              {s.failureRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Failures */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Recent Failures</h3>
              {data.recentFailures.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Keine Fehler im ausgewählten Zeitraum</p>
              ) : (
                <div className="space-y-1">
                  {data.recentFailures.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedRunId(f.id)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", OUTCOME_DOT[f.outcome] ?? "bg-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-foreground">{f.stateName ?? "Unknown"}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{f.channel ?? "—"}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {new Date(f.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {f.errorMessage && (
                          <p className="text-xs text-red-500 mt-1 line-clamp-2">{f.errorMessage}</p>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        f.outcome === "LLM_ERROR" ? "text-red-500 bg-red-500/10" :
                        f.outcome === "TOOL_EXECUTION_FAILED" ? "text-red-500 bg-red-500/10" :
                        f.outcome === "HANDOFF_BLOCKED" ? "text-amber-500 bg-amber-500/10" :
                        "text-purple-500 bg-purple-500/10"
                      )}>
                        {f.outcome}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AgentRunDetailDrawer
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
      />
    </div>
  )
}
