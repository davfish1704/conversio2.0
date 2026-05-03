"use client"

import { Suspense, useEffect, useState, useContext } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts"
import {
  LayoutDashboard, Plus, TrendingUp, BarChart3, PieChart as PieIcon,
  ArrowLeft, Kanban, Users, ChevronRight
} from "lucide-react"
import { useTheme } from "@/lib/ThemeContext"
import { LanguageContext } from "@/lib/LanguageContext"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  _count?: { states: number; members: number; conversations: number }
}

interface BoardStats {
  daily: { date: string; count: number }[]
  channel: { name: string; value: number }[]
  status: { name: string; value: number }[]
  totalLeads: number
  activeLeads: number
  newThisWeek: number
}

const CHANNEL_COLORS = {
  WhatsApp: "#10B981", Facebook: "#3B82F6", Manual: "#9CA3AF", unknown: "#D1D5DB",
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#10B981", Frozen: "#EF4444", CLOSED: "#6B7280", ARCHIVED: "#F59E0B",
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}`
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardId = searchParams.get("board")
  const { t } = useContext(LanguageContext)
  const { theme } = useTheme()
  const tooltipStyle = theme === "dark"
    ? { borderRadius: "8px", border: "1px solid #374151", backgroundColor: "#1f2937", color: "#f9fafb", fontSize: "12px" }
    : { borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }

  const [boards, setBoards] = useState<Board[]>([])
  const [boardStats, setBoardStats] = useState<BoardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDesc, setNewBoardDesc] = useState("")
  const [formError, setFormError] = useState("")
  const [formLoading, setFormLoading] = useState(false)

  const selectedBoard = boards.find(b => b.id === boardId) || null

  // Load all boards
  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((data) => {
        setBoards(data.boards || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load board-specific stats when board selected
  useEffect(() => {
    if (!selectedBoard) {
      setBoardStats(null)
      return
    }
    fetch(`/api/boards/${selectedBoard.id}/pipeline`)
      .then((r) => r.json())
      .then((data) => {
        const allLeads: any[] = [
          ...(data.states || []).flatMap((s: any) => s.leads || []),
          ...(data.unassignedLeads || []),
        ]

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const dailyMap = new Map<string, number>()
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dailyMap.set(d.toISOString().split("T")[0], 0)
        }

        allLeads.forEach((c) => {
          if (!c.createdAt) return
          const day = new Date(c.createdAt).toISOString().split("T")[0]
          if (dailyMap.has(day)) {
            dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
          }
        })

        const channelMap = new Map<string, number>()
        allLeads.forEach((c) => {
          const source = c.source || "unknown"
          channelMap.set(source, (channelMap.get(source) || 0) + 1)
        })

        // Status map - using aiEnabled/frozen instead of old status field
        const statusMap = new Map<string, number>()
        const activeCount = allLeads.filter((c) => c.aiEnabled !== false && c.frozen !== true).length
        const frozenCount = allLeads.filter((c) => c.frozen === true).length
        statusMap.set("Active", activeCount)
        if (frozenCount > 0) statusMap.set("Frozen", frozenCount)

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        setBoardStats({
          daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
          channel: Array.from(channelMap.entries()).map(([name, value]) => ({
            name: name === "whatsapp" ? "WhatsApp" : name === "facebook" ? "Facebook" : name === "manual" ? "Manual" : name,
            value,
          })),
          status: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
          totalLeads: allLeads.length,
          activeLeads: allLeads.filter((c) => c.aiEnabled !== false && c.frozen !== true).length,
          newThisWeek: allLeads.filter((c) => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo).length,
        })
      })
      .catch(console.error)
  }, [selectedBoard?.id])

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBoardName, description: newBoardDesc }),
    })
    setFormLoading(false)
    if (res.ok) {
      const data = await res.json()
      setBoards((prev) => [...prev, data.board])
      setIsModalOpen(false)
      setNewBoardName("")
      setNewBoardDesc("")
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || t('dashboard.boardCreateError'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const activeBoards = boards.filter((b) => b.isActive)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {selectedBoard && (
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6" />
                {selectedBoard ? selectedBoard.name : t("nav.dashboard") || "Dashboard"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedBoard
                  ? `${boardStats?.totalLeads || 0} ${t("common.leads")} · ${boardStats?.activeLeads || 0} ${t("common.active")}`
                  : `${boards.length} ${t("nav.boards")} · ${activeBoards.length} ${t("common.active")}`
                }
              </p>
            </div>
          </div>
          {selectedBoard ? (
            <Link
              href={`/boards/${selectedBoard.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Kanban className="w-4 h-4" />
              {t("nav.pipeline")}
            </Link>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("common.newBoard")}
            </button>
          )}
        </div>

        {/* Board List OR Board Stats */}
        {!selectedBoard ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/dashboard?board=${board.id}`}
                className="block p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{board.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      board.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {board.isActive ? t("common.active") : t("common.inactive")}
                  </span>
                </div>
                {board.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{board.description}</p>
                )}
                <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t("nav.states")}</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {board._count?.states || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t("common.leads")}</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {board._count?.conversations || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4 mx-auto" />
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {board._count?.members || 0}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : boardStats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("dashboard.totalLeads")}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{boardStats.totalLeads}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  +{boardStats.newThisWeek} {t("dashboard.thisWeek")}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t("common.active")}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{boardStats.activeLeads}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {boardStats.totalLeads > 0
                    ? `${Math.round((boardStats.activeLeads / boardStats.totalLeads) * 100)}% ${t("dashboard.ofTotal")}`
                    : "0% of total"}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t("nav.states")}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{selectedBoard?._count?.states || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("dashboard.pipelineStages")}</p>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t("common.members")}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{selectedBoard?._count?.members || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("dashboard.teamMembers")}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Lead Volume Chart */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t("dashboard.leadVolume")}</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={boardStats.daily}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#E5E7EB"} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"}
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} style={{ fontSize: "12px" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fillOpacity={1} fill="url(#colorLeads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* By Channel Chart */}
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <PieIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t("dashboard.byChannel")}</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={boardStats.channel}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {boardStats.channel.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHANNEL_COLORS[entry.name as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.unknown}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("dashboard.statusOverview")}</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={boardStats.status}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#E5E7EB"} />
                  <XAxis dataKey="name" stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} style={{ fontSize: "12px" }} />
                  <YAxis stroke={theme === "dark" ? "#9CA3AF" : "#6B7280"} style={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {boardStats.status.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#9CA3AF"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : null}
      </div>

      {/* Create Board Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">{t("common.newBoard")}</h2>
            <form onSubmit={createBoard}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("common.name")}
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("common.description")}
                </label>
                <textarea
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              {formError && <p className="text-sm text-red-600 mb-4">{formError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setFormError("")
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? t("common.creating") : t("common.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
