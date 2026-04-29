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

const FUNNEL_COLORS = ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"]

type RangeOption = 7 | 30 | 90

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}`
}

export default function ReportsPage() {
  const { t } = useContext(LanguageContext)
  const { theme } = useTheme()
  const tooltipStyle = theme === "dark"
    ? { borderRadius: "8px", border: "1px solid #374151", backgroundColor: "#1f2937", color: "#f9fafb", fontSize: "12px" }
    : { borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [range, setRange] = useState<RangeOption>(30)
  const [loading, setLoading] = useState(true)

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
    STUCK: "bg-yellow-100 text-yellow-800",
    ERROR: "bg-red-100 text-red-800",
    MANUAL_INTERVENTION: "bg-purple-100 text-purple-800",
    INFO: "bg-blue-100 text-blue-800",
  }

  const statusColor: Record<string, string> = {
    OPEN: "bg-gray-100 dark:bg-gray-800 text-gray-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    RESOLVED: "bg-green-100 text-green-800",
    IGNORED: "bg-gray-100 dark:bg-gray-800 text-gray-500",
  }

  const rangeLabel = range === 7 ? "Last 7 Days" : range === 30 ? "Last 30 Days" : "Last 90 Days"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-400 mt-1">
            {stats?.totalLeads ?? 0} total leads · {rangeLabel}
          </p>
        </div>

        {/* Range Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 dark:border-gray-800 rounded-lg p-1">
          <Filter className="w-4 h-4 text-gray-400 ml-2" />
          {([7, 30, 90] as RangeOption[]).map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                range === d
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:bg-gray-50"
              }`}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 p-5 shadow-sm transition-colors">
            <p className="text-sm text-gray-500">Total Leads</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white mt-1">{stats.totalLeads}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.newThisWeek} this week</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 p-5 shadow-sm transition-colors">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white mt-1">{stats.activeLeads}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2">
              {stats.totalLeads > 0 ? Math.round((stats.activeLeads / stats.totalLeads) * 100) : 0}% of total
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 p-5 shadow-sm transition-colors">
            <p className="text-sm text-gray-500">Needs Reply</p>
            <p className="text-3xl font-bold text-rose-600 mt-1">{stats.needsReply}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2">In last 24 hours</p>
          </div>
          <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 p-5 shadow-sm transition-colors">
            <p className="text-sm text-gray-500">Open Reports</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white mt-1">
              {reports.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 mt-2">{reports.filter((r) => r.status === "RESOLVED").length} resolved</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && stats.daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Volume */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Lead Volume</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.daily}>
                  <defs>
                    <linearGradient id="reportColorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} leads`, "Count"]}
                    labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#reportColorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-gray-900">By Channel</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.channel}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Status Breakdown</h2>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.status} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12, fill: "#4B5563" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} leads`, "Count"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#9CA3AF"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Conversion Funnel</h2>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 12, fill: "#4B5563" }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} leads`, "Count"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
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
      <div className="bg-white dark:bg-gray-900 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 dark:border-gray-800 dark:border-gray-800 overflow-hidden shadow-sm transition-colors">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            System Reports
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-black dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Board</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{report.boardName}</td>
                  <td className="px-4 py-3 text-gray-500">{report.stateName || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        typeColor[report.type] || "bg-gray-100 dark:bg-gray-800 text-gray-800"
                      }`}
                    >
                      {report.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{report.message}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        statusColor[report.status] || "bg-gray-100 dark:bg-gray-800 text-gray-800"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {report.status !== "RESOLVED" && (
                      <button
                        onClick={() => updateStatus(report.id, "RESOLVED")}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Resolve
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
            <p className="text-gray-500">No reports available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
