"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import BoardNav from "@/components/boards/BoardNav"
import { useTheme } from "@/lib/ThemeContext"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

interface UsageData {
  allTime: { totalTokens: number; inputTokens: number; outputTokens: number; cost: number }
  last30d: { totalTokens: number; inputTokens: number; outputTokens: number; cost: number }
  byModel: { model: string; provider: string; totalTokens: number; inputTokens: number; outputTokens: number; cost: number }[]
  topConversations: { conversationId: string; totalTokens: number; cost: number; calls: number }[]
  byDay: { date: string; totalTokens: number; cost: number }[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCost(n: number) {
  if (n < 0.001) return `$${(n * 1000).toFixed(3)}m`
  return `$${n.toFixed(4)}`
}

function fmtDate(iso: string) {
  return iso.slice(5)
}

export default function BoardUsagePage() {
  const { id } = useParams() as { id: string }
  const { theme } = useTheme()
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/boards/${id}/usage?days=${days}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [id, days])

  useEffect(() => { fetchData() }, [fetchData])

  const gridColor = theme === "dark" ? "#2a2d3a" : "#e5e7eb"
  const tickColor = theme === "dark" ? "#6b7280" : "#9ca3af"
  const barFill = theme === "dark" ? "#5b8dee" : "#3b82f6"
  const tooltipStyle = theme === "dark"
    ? { borderRadius: "8px", border: "1px solid #2a2d3a", backgroundColor: "#1a1d2e", color: "#f0f1f5", fontSize: "12px" }
    : { borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }

  const selectClass = "px-3 py-1.5 text-sm border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Token Usage</h1>
              <p className="text-xs text-muted-foreground mt-0.5">KI-Verbrauch und Kosten</p>
            </div>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={selectClass}>
              <option value={7}>Letzte 7 Tage</option>
              <option value={30}>Letzte 30 Tage</option>
              <option value={90}>Letzte 90 Tage</option>
            </select>
          </div>
          <BoardNav />
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : !data ? (
          <div className="text-center py-24 text-muted-foreground text-sm">Keine Daten verfügbar.</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: `Tokens (${days}d)`, value: fmt(data.last30d.totalTokens), sub: `${fmt(data.last30d.inputTokens)} in / ${fmt(data.last30d.outputTokens)} out` },
                { label: "Tokens (gesamt)", value: fmt(data.allTime.totalTokens), sub: `${fmt(data.allTime.inputTokens)} in / ${fmt(data.allTime.outputTokens)} out` },
                { label: `Kosten (${days}d)`, value: fmtCost(data.last30d.cost), sub: "Provider-Kosten" },
                { label: "Kosten (gesamt)", value: fmtCost(data.allTime.cost), sub: "Provider-Kosten" },
              ].map((card) => (
                <div key={card.label} className="bg-card rounded-xl border border-border p-5">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Daily Chart */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Token-Verbrauch — letzte {days} Tage
              </h3>
              {data.byDay.every((d) => d.totalTokens === 0) ? (
                <div className="text-center py-10 text-muted-foreground text-xs">Noch keine Daten in diesem Zeitraum.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDate}
                      tick={{ fontSize: 11, fill: tickColor }}
                      interval={Math.floor(data.byDay.length / 8)}
                    />
                    <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: tickColor }} width={48} />
                    <Tooltip
                      formatter={(val) => [fmt(Number(val ?? 0)), "Tokens"]}
                      labelFormatter={(l) => `Datum: ${l}`}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="totalTokens" fill={barFill} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* By Model */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Aufschlüsselung nach Modell</h3>
              {data.byModel.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Keine Daten in diesem Zeitraum.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="pb-2 font-medium">Modell</th>
                        <th className="pb-2 font-medium">Provider</th>
                        <th className="pb-2 font-medium text-right">Input</th>
                        <th className="pb-2 font-medium text-right">Output</th>
                        <th className="pb-2 font-medium text-right">Gesamt</th>
                        <th className="pb-2 font-medium text-right">Kosten</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.byModel.map((row) => (
                        <tr key={`${row.provider}-${row.model}`} className="text-foreground">
                          <td className="py-2.5 font-mono text-xs">{row.model}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-md text-xs bg-primary/10 text-primary">
                              {row.provider}
                            </span>
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmt(row.inputTokens)}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmt(row.outputTokens)}</td>
                          <td className="py-2.5 text-right tabular-nums font-medium">{fmt(row.totalTokens)}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtCost(row.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Conversations */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Top 10 Conversations nach Token-Verbrauch
              </h3>
              {data.topConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Keine Daten in diesem Zeitraum.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="pb-2 font-medium">Conversation ID</th>
                        <th className="pb-2 font-medium text-right">Tokens</th>
                        <th className="pb-2 font-medium text-right">KI-Calls</th>
                        <th className="pb-2 font-medium text-right">Kosten</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.topConversations.map((row) => (
                        <tr key={row.conversationId} className="text-foreground">
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">{row.conversationId}</td>
                          <td className="py-2.5 text-right tabular-nums font-medium">{fmt(row.totalTokens)}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{row.calls}</td>
                          <td className="py-2.5 text-right tabular-nums text-muted-foreground">{fmtCost(row.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
