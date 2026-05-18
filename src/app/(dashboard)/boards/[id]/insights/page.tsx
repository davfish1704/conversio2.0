"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import BoardNav from "@/components/boards/BoardNav"
import AgentRunDetailDrawer from "@/components/boards/AgentRunDetailDrawer"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts"
import { cn } from "@/lib/utils"

interface StatsData {
  total: number; totalCost: number; totalTokens: number; avgLatency: number; handoffSuccessRate: number | null
  byState: Array<{
    stateId: string; stateName: string; total: number; success: number; handoff: number; error: number
    totalCost: number; avgLatency: number; totalTokens: number; failureRate: number; handoffRate: number
  }>
  recentFailures: Array<{ id: string; outcome: string; errorMessage: string | null; createdAt: string; stateName: string | null; channel: string | null }>
}

interface UsageData {
  byModel: Array<{ model: string; provider: string; totalTokens: number; inputTokens: number; outputTokens: number; cost: number }>
  byDay: Array<{ date: string; totalTokens: number; cost: number }>
}

const SINCE_OPTIONS = [
  { value: "24h", label: "24h" }, { value: "7d", label: "7d" }, { value: "30d", label: "30d" },
] as const

function fmtCost(cents: number) { return `$${(cents / 100).toFixed(4)}` }
function fmtToken(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

type SortKey = "total" | "totalCost" | "failureRate" | "avgLatency" | "totalTokens"
type SortDir = "asc" | "desc"

const OUTCOME_DOT: Record<string, string> = {
  LLM_ERROR: "bg-red-500", TOOL_EXECUTION_FAILED: "bg-red-500",
  HANDOFF_BLOCKED: "bg-amber-500", ESCALATED: "bg-purple-500",
}

function SparklineChart({ data, dataKey, color }: { data: { date: string; totalTokens: number }[]; dataKey: "totalTokens"; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function BoardInsightsPage() {
  const { id } = useParams() as { id: string }
  const [stats, setStats] = useState<StatsData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [since, setSince] = useState("7d")
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const gridColor = "hsl(var(--border))"
  const tickColor = "hsl(var(--text-tertiary))"
  const barFill = "hsl(var(--primary))"
  const barFailFill = "#ef4444"
  const tooltipStyle = {
    borderRadius: "6px", border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--bg-elevated))", color: "hsl(var(--text-primary))",
    fontSize: "12px", padding: "8px 12px",
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/crm/boards/${id}/agent-runs/stats?since=${since}`).then((r) => r.json()),
      fetch(`/api/boards/${id}/usage?days=${since === "24h" ? 1 : since === "7d" ? 7 : 30}`).then((r) => r.json()),
    ])
      .then(([s, u]) => { setStats(s); setUsage(u) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, since])

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/crm/boards/${id}/agent-runs/stats?since=${since}`)
        .then((r) => r.ok ? r.json() : null).then((d) => { if (d) setStats(d) }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [id, since])

  const chartData = useMemo(() => {
    if (!stats?.byState) return []
    return stats.byState.slice(0, 10).map((s) => ({
      name: s.stateName.length > 12 ? s.stateName.slice(0, 12) + "…" : s.stateName,
      runs: s.total, failures: s.error,
    }))
  }, [stats])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "desc" ? "asc" : "desc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const sortedStates = useMemo(() => {
    if (!stats?.byState) return []
    return [...stats.byState].sort((a, b) => {
      const mul = sortDir === "desc" ? 1 : -1; return (a[sortKey] - b[sortKey]) * mul
    })
  }, [stats, sortKey, sortDir])

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-elevated border-b border-border">
        <div className="px-6">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-text-primary">AI Insights</h1>
              <p className="text-xs text-text-secondary mt-0.5">Sub-Agent Performance & Analytics</p>
            </div>
            <div className="flex items-center gap-1.5">
              {SINCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSince(opt.value)}
                  className={cn(
                    "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors",
                    since === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-text-secondary hover:bg-muted/80"
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

      <div className="px-6 py-5 space-y-4">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-bg-elevated rounded-lg border border-border p-4 space-y-2 animate-pulse">
                <div className="h-3 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-20" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : !stats ? (
          <div className="text-center py-24 text-text-secondary text-sm">Keine Daten verfügbar.</div>
        ) : (
          <>
            {/* Stats Cards with Sparklines */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total AI Runs", value: stats.total.toLocaleString(), sub: "im Zeitraum", sparkData: usage?.byDay ?? [] },
                { label: "Total Cost", value: fmtCost(stats.totalCost * 100), sub: `${fmtToken(stats.totalTokens)} Tokens`, sparkData: usage?.byDay ?? [] },
                { label: "Avg Latency", value: stats.avgLatency > 1000 ? `${(stats.avgLatency / 1000).toFixed(1)}s` : `${stats.avgLatency}ms`, sub: "pro AI Call" },
                { label: "Handoff Success", value: stats.handoffSuccessRate != null ? `${stats.handoffSuccessRate}%` : "—", sub: "erfolgreiche Übergaben" },
              ].map((card, i) => (
                <div key={i} className="bg-bg-elevated rounded-lg border border-border p-4">
                  <p className="text-[11px] text-text-secondary">{card.label}</p>
                  <p className="text-xl font-semibold text-text-primary mt-1 tabular-nums">{card.value}</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{card.sub}</p>
                  {card.sparkData && card.sparkData.length > 1 && i < 2 && (
                    <div className="mt-2 -mx-1">
                      <SparklineChart data={card.sparkData} dataKey="totalTokens" color={barFill} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chart: Runs by State */}
            <div className="bg-bg-elevated rounded-lg border border-border p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-3">Runs by State (Top 10)</h3>
              {chartData.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">Keine Daten</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: tickColor }} interval={0} angle={-20} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10, fill: tickColor }} width={32} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="runs" fill={barFill} radius={[2, 2, 0, 0]} name="Runs" />
                    <Bar dataKey="failures" fill={barFailFill} radius={[2, 2, 0, 0]} name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Cost by Provider */}
            {usage?.byModel && usage.byModel.length > 0 && (
              <div className="bg-bg-elevated rounded-lg border border-border p-4">
                <h3 className="text-xs font-semibold text-text-primary mb-3">Cost by Provider</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-text-secondary border-b border-border">
                        <th className="pb-2 font-medium">Model</th>
                        <th className="pb-2 font-medium">Provider</th>
                        <th className="pb-2 font-medium text-right">Tokens</th>
                        <th className="pb-2 font-medium text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {usage.byModel.map((row) => (
                        <tr key={`${row.provider}-${row.model}`} className="text-text-primary">
                          <td className="py-2 text-xs font-mono">{row.model}</td>
                          <td className="py-2">
                            <span className="px-1.5 py-[1px] rounded text-[10px] bg-primary/10 text-primary">{row.provider}</span>
                          </td>
                          <td className="py-2 text-right text-xs tabular-nums text-text-secondary">{fmtToken(row.totalTokens)}</td>
                          <td className="py-2 text-right text-xs tabular-nums text-text-secondary">{`$${row.cost.toFixed(4)}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* State Performance Table */}
            <div className="bg-bg-elevated rounded-lg border border-border p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-3">State Performance</h3>
              {sortedStates.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">Keine Daten</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-text-secondary border-b border-border">
                        <th className="pb-2 font-medium">State</th>
                        {([{ key: "total", label: "Runs" }, { key: "totalCost", label: "Cost" }, { key: "totalTokens", label: "Tokens" }, { key: "avgLatency", label: "Latency" }, { key: "failureRate", label: "Fail Rate" }] as const).map((col) => (
                          <th key={col.key} onClick={() => toggleSort(col.key as SortKey)}
                            className="pb-2 font-medium text-right cursor-pointer hover:text-text-primary transition-colors">
                            {col.label}{sortKey === col.key && <span className="ml-1 text-primary">{sortDir === "desc" ? "↓" : "↑"}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedStates.map((s) => (
                        <tr key={s.stateId} className="text-text-primary hover:bg-muted/30 transition-colors">
                          <td className="py-2 text-xs font-medium">{s.stateName}</td>
                          <td className="py-2 text-right text-xs tabular-nums">{s.total}</td>
                          <td className="py-2 text-right text-xs tabular-nums text-text-secondary">{fmtCost(s.totalCost * 100)}</td>
                          <td className="py-2 text-right text-xs tabular-nums text-text-secondary">{fmtToken(s.totalTokens)}</td>
                          <td className="py-2 text-right text-xs tabular-nums">{s.avgLatency > 1000 ? `${(s.avgLatency / 1000).toFixed(1)}s` : `${s.avgLatency}ms`}</td>
                          <td className="py-2 text-right">
                            <span className={cn("tabular-nums text-xs font-medium", s.failureRate > 20 ? "text-destructive" : s.failureRate > 5 ? "text-warning" : "text-success")}>{s.failureRate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Failures */}
            <div className="bg-bg-elevated rounded-lg border border-border p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-3">Recent Failures</h3>
              {stats.recentFailures.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">Keine Fehler im Zeitraum</p>
              ) : (
                <div className="space-y-1">
                  {stats.recentFailures.map((f) => (
                    <button key={f.id} onClick={() => setSelectedRunId(f.id)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", OUTCOME_DOT[f.outcome] ?? "bg-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-text-primary">{f.stateName ?? "Unknown"}</span>
                          <span className="text-text-tertiary">·</span>
                          <span className="text-text-tertiary">{f.channel ?? "—"}</span>
                          <span className="text-text-tertiary">·</span>
                          <span className="text-text-tertiary">{new Date(f.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {f.errorMessage && <p className="text-xs text-destructive mt-1 line-clamp-2">{f.errorMessage}</p>}
                      </div>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", f.outcome === "LLM_ERROR" || f.outcome === "TOOL_EXECUTION_FAILED" ? "text-destructive bg-destructive/10" : f.outcome === "HANDOFF_BLOCKED" ? "text-warning bg-warning/10" : "text-purple-500 bg-purple-500/10")}>{f.outcome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Supervisor Activity Feed — coming soon */}
            <div className="bg-bg-elevated rounded-lg border border-border p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-3">Supervisor Activity</h3>
              <p className="text-xs text-text-tertiary text-center py-6">Supervisor action log wird in Kürze angezeigt.</p>
            </div>
          </>
        )}
      </div>

      <AgentRunDetailDrawer runId={selectedRunId} onClose={() => setSelectedRunId(null)} />
    </div>
  )
}
