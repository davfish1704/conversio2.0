"use client"

import { useEffect, useState, useContext } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Filter,
  CheckCircle,
  AlertTriangle,
  Activity,
} from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"
import { useTheme } from "@/lib/ThemeContext"
import { cn } from "@/lib/utils"

interface Report {
  id: string
  boardId: string
  boardName: string
  stateId: string | null
  stateName: string | null
  type: string
  message: string
  status: string
  createdAt: string
}

interface DashboardStats {
  daily: { date: string; count: number }[]
  channel: { name: string; value: number }[]
  status: { name: string; value: number }[]
  funnel: { name: string; value: number }[]
  totalLeads: number
  activeLeads: number
  newThisWeek: number
  needsReply: number
}

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: "#10B981",
  Facebook: "#3B82F6",
  Manual: "#9CA3AF",
  unknown: "#D1D5DB",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10B981",
  CLOSED: "#6B7280",
  ARCHIVED: "#F59E0B",
  FROZEN: "#EF4444",
}

const FUNNEL_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"]

type RangeOption = 7 | 30 | 90

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}`
}

export default function ReportsPage() {
  const { t } = useContext(LanguageContext)
  const { theme } = useTheme()
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [range, setRange] = useState<RangeOption>(30)
  const [loading, setLoading] = useState(true)

  const gridColor = theme === "dark" ? "#2a2d3a" : "#f3f4f6"
  const tickColor = theme === "dark" ? "#6b7280" : "#9ca3af"
  const tooltipStyle = theme === "dark"
    ? { borderRadius: "8px", border: "1px solid #2a2d3a", backgroundColor: "#1a1d2e", color: "#f0f1f5", fontSize: "12px" }
    : { borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then((r) => r.json()),
      fetch(`/api/dashboard/stats?days=${range}`).then((r) => r.json()),
    ])
      .then(([reportsData, statsData]) => {
        setReports(reportsData.reports || [])
        setStats(statsData)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [range])

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/reports", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    }
  }

  const typeColor: Record<string, string> = {
    STUCK: "bg-warning/15 text-warning",
    ERROR: "bg-destructive/10 text-destructive",
    MANUAL_INTERVENTION: "bg-primary/10 text-primary",
    INFO: "bg-muted text-muted-foreground",
  }

  const statusColor: Record<string, string> = {
    OPEN: "bg-muted text-foreground",
    IN_PROGRESS: "bg-primary/10 text-primary",
    RESOLVED: "bg-success/10 text-success",
    IGNORED: "bg-muted text-muted-foreground",
  }

  const rangeLabel = range === 7 ? "Letzte 7 Tage" : range === 30 ? "Letzte 30 Tage" : "Letzte 90 Tage"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.totalLeads ?? 0} Leads gesamt · {rangeLabel}
          </p>
        </div>

        {/* Range Filter */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1.5" />
          {([7, 30, 90] as RangeOption[]).map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                range === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {d}T
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Leads gesamt</p>
            <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stats.totalLeads}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-success">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.newThisWeek} diese Woche</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Aktiv</p>
            <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stats.activeLeads}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalLeads > 0 ? Math.round((stats.activeLeads / stats.totalLeads) * 100) : 0}% von gesamt
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Braucht Antwort</p>
            <p className="text-2xl font-bold text-destructive mt-1 tabular-nums">{stats.needsReply}</p>
            <p className="text-xs text-muted-foreground mt-2">In den letzten 24 Stunden</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">Offene Reports</p>
            <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
              {reports.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{reports.filter((r) => r.status === "RESOLVED").length} gelöst</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && stats.daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lead Volume */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Lead-Volumen</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.daily}>
                  <defs>
                    <linearGradient id="reportColorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} Leads`, "Anzahl"]}
                    labelFormatter={(label) => new Date(String(label)).toLocaleDateString("de-DE")}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#reportColorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <PieIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Nach Kanal</h2>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.channel}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.channel.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHANNEL_COLORS[entry.name] || "#9CA3AF"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [`${value}`, String(name)]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle className="w-4 h-4 text-success" />
              <h2 className="text-sm font-semibold text-foreground">Status-Übersicht</h2>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.status} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} Leads`, "Anzahl"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {stats.status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#9CA3AF"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Conversion Funnel</h2>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} Leads`, "Anzahl"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.funnel.map((_entry, index) => (
                      <Cell key={`funnel-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            System Reports
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-xs font-medium">Board</th>
                <th className="px-4 py-3 text-xs font-medium">State</th>
                <th className="px-4 py-3 text-xs font-medium">Typ</th>
                <th className="px-4 py-3 text-xs font-medium">Nachricht</th>
                <th className="px-4 py-3 text-xs font-medium">Status</th>
                <th className="px-4 py-3 text-xs font-medium">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-foreground font-medium">{report.boardName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{report.stateName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-medium rounded-md",
                      typeColor[report.type] || "bg-muted text-muted-foreground"
                    )}>
                      {report.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{report.message}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-medium rounded-md",
                      statusColor[report.status] || "bg-muted text-muted-foreground"
                    )}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {report.status !== "RESOLVED" && (
                      <button
                        onClick={() => updateStatus(report.id, "RESOLVED")}
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        Lösen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reports.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Keine Reports vorhanden.</p>
          </div>
        )}
      </div>
    </div>
  )
}
