"use client"

import { useEffect, useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

interface AdminUsageData {
  summary: {
    totalTokens: number
    inputTokens: number
    outputTokens: number
    providerCost: number
    charged: number
    margin: number
    marginPct: number
  }
  byBoard: {
    boardId: string
    boardName: string
    ownerEmail: string
    totalTokens: number
    providerCost: number
    charged: number
    margin: number
    marginPct: number
  }[]
  byModel: { model: string; provider: string; totalTokens: number; providerCost: number }[]
}

type SortKey = "totalTokens" | "providerCost" | "margin"

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCost(n: number) {
  return `$${n.toFixed(4)}`
}

const PROVIDER_COLORS: Record<string, string> = {
  groq: "#8b5cf6",
  openai: "#10b981",
  anthropic: "#f59e0b",
  deepseek: "#3b82f6",
  openrouter: "#ec4899",
}

export default function AdminUsageContent() {
  const [data, setData] = useState<AdminUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [sortKey, setSortKey] = useState<SortKey>("totalTokens")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { fetchData() }, [fetchData])

  const sortedBoards = data?.byBoard.slice().sort((a, b) => b[sortKey] - a[sortKey]) ?? []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Token Usage — Admin</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Globale KI-Kosten und Profitabilität</p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
          >
            <option value={7}>Letzte 7 Tage</option>
            <option value={30}>Letzte 30 Tage</option>
            <option value={90}>Letzte 90 Tage</option>
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : !data ? (
          <div className="text-center py-24 text-gray-500">Keine Daten verfügbar.</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: `Tokens (${days}d)`,
                  value: fmt(data.summary.totalTokens),
                  sub: `${fmt(data.summary.inputTokens)} in / ${fmt(data.summary.outputTokens)} out`,
                  color: "blue",
                },
                {
                  label: "Provider-Kosten",
                  value: fmtCost(data.summary.providerCost),
                  sub: "Tatsächliche API-Kosten",
                  color: "red",
                },
                {
                  label: "Verrechnet (2×)",
                  value: fmtCost(data.summary.charged),
                  sub: "Basis: 2× Markup",
                  color: "green",
                },
                {
                  label: "Marge",
                  value: fmtCost(data.summary.margin),
                  sub: `${data.summary.marginPct}% Marge`,
                  color: "purple",
                },
              ].map((card) => (
                <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Model Breakdown Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Modell-Nutzung</h3>
              {data.byModel.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Keine Daten.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byModel} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis
                      type="category"
                      dataKey="model"
                      width={180}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                    />
                    <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Tokens"]} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="totalTokens" radius={[0, 3, 3, 0]}>
                      {data.byModel.map((row) => (
                        <Cell key={row.model} fill={PROVIDER_COLORS[row.provider] ?? "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* Provider legend */}
              <div className="flex flex-wrap gap-3 mt-3">
                {[...new Set(data.byModel.map((r) => r.provider))].map((p) => (
                  <span key={p} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PROVIDER_COLORS[p] ?? "#6b7280" }} />
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Board Ranking Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Board-Ranking</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Sortieren nach:</span>
                  {(["totalTokens", "providerCost", "margin"] as SortKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setSortKey(k)}
                      className={`px-2 py-1 text-xs rounded-lg border transition ${
                        sortKey === k
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {k === "totalTokens" ? "Tokens" : k === "providerCost" ? "Kosten" : "Marge"}
                    </button>
                  ))}
                </div>
              </div>
              {sortedBoards.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Keine Daten.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                        <th className="pb-2 font-medium">Board</th>
                        <th className="pb-2 font-medium">Owner</th>
                        <th className="pb-2 font-medium text-right">Tokens</th>
                        <th className="pb-2 font-medium text-right">Kosten</th>
                        <th className="pb-2 font-medium text-right">Verrechnet</th>
                        <th className="pb-2 font-medium text-right">Marge</th>
                        <th className="pb-2 font-medium text-right">Marge%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {sortedBoards.map((row) => (
                        <tr key={row.boardId} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2.5 font-medium">{row.boardName}</td>
                          <td className="py-2.5 text-xs text-gray-500">{row.ownerEmail}</td>
                          <td className="py-2.5 text-right tabular-nums">{fmt(row.totalTokens)}</td>
                          <td className="py-2.5 text-right tabular-nums text-red-600 dark:text-red-400">{fmtCost(row.providerCost)}</td>
                          <td className="py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">{fmtCost(row.charged)}</td>
                          <td className="py-2.5 text-right tabular-nums">{fmtCost(row.margin)}</td>
                          <td className="py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              row.marginPct >= 40 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : row.marginPct >= 20 ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                            }`}>
                              {row.marginPct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Model Cost Reference */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Modell-Kosten Referenz</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">Modell</th>
                      <th className="pb-2 font-medium">Provider</th>
                      <th className="pb-2 font-medium text-right">Tokens verbraucht</th>
                      <th className="pb-2 font-medium text-right">Kosten gesamt</th>
                      <th className="pb-2 font-medium text-right">$/1k Tokens (ø)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {data.byModel.map((row) => (
                      <tr key={`${row.provider}-${row.model}`} className="text-gray-700 dark:text-gray-300">
                        <td className="py-2.5 font-mono text-xs">{row.model}</td>
                        <td className="py-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs text-white"
                            style={{ background: PROVIDER_COLORS[row.provider] ?? "#6b7280" }}
                          >
                            {row.provider}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{fmt(row.totalTokens)}</td>
                        <td className="py-2.5 text-right tabular-nums">{fmtCost(row.providerCost)}</td>
                        <td className="py-2.5 text-right tabular-nums text-gray-500">
                          {row.totalTokens > 0
                            ? `$${((row.providerCost / row.totalTokens) * 1000).toFixed(5)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
