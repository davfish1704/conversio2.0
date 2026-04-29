"use client"

import { Suspense, useEffect, useState } from "react"
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
  ACTIVE: "#10B981", CLOSED: "#6B7280", ARCHIVED: "#F59E0B", FROZEN: "#EF4444",
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}`
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardId = searchParams.get("board")
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

        const statusMap = new Map<string, number>()
        allLeads.forEach((c) => {
          statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1)
        })

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
          activeLeads: allLeads.filter((c) => c.status === "ACTIVE").length,
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
      setFormError(data.error || "Board konnte nicht erstellt werden")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // BOARD DETAIL VIEW
  if (selectedBoard) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedBoard.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {boardStats?.totalLeads ?? 0} Leads · {boardStats?.activeLeads ?? 0} aktiv
              </p>
            </div>
          </div>
          <Link
            href={`/boards/${selectedBoard.id}`}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition"
          >
            <Kanban className="w-4 h-4" />
            Pipeline
          </Link>
        </div>

        {/* Stats Cards */}
        {boardStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm transition-colors">
              <p className="text-sm text-gray-500 dark:text-gray-400">Leads gesamt</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{boardStats.totalLeads}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                <span>+{boardStats.newThisWeek} diese Woche</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm transition-colors">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktiv</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{boardStats.activeLeads}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {boardStats.totalLeads > 0 ? Math.round((boardStats.activeLeads / boardStats.totalLeads) * 100) : 0}% von gesamt
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm transition-colors">
              <p className="text-sm text-gray-500 dark:text-gray-400">States</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{selectedBoard._count?.states || 0}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Pipeline-Stufen</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm transition-colors">
              <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{selectedBoard._count?.members || 0}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Teammitglieder</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {boardStats && boardStats.daily.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Volume */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lead-Volumen (30 Tage)</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={boardStats.daily}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Channel */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm transition-colors">
              <div className="flex items-center gap-2 mb-6">
                <PieIcon className="w-5 h-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nach Kanal</h2>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={boardStats.channel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {boardStats.channel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.name as keyof typeof CHANNEL_COLORS] || "#9CA3AF"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl transition-colors border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status-Übersicht</h2>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={boardStats.status} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#4B5563" }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                      {boardStats.status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#9CA3AF"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // BOARDS OVERVIEW (default view)
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{boards.length} Boards · {boards.filter(b => b.isActive).length} aktiv</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neues Board
        </button>
      </div>

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center transition-colors">
          <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Noch keine Boards erstellt</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Erstelle dein erstes Board, um Leads zu verwalten und deine Pipeline aufzubauen.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            Erstes Board erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <div
              key={board.id}
              onClick={() => router.push(`/dashboard?board=${board.id}`)}
              className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-all hover:shadow-md p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                  {board.name}
                </h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    board.isActive
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {board.isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>

              {board.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{board.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500">States</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{board._count?.states || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Leads</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{board._count?.conversations || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">
                    <Users className="w-3 h-3 inline mr-0.5" />
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{board._count?.members || 0}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center text-sm text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Details anzeigen <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl transition-colors w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Neues Board erstellen</h2>
            <form onSubmit={createBoard} className="mt-4 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                  placeholder="z.B. Versicherungsvertrieb"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Beschreibung</label>
                <textarea
                  value={newBoardDesc}
                  onChange={(e) => setNewBoardDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  rows={3}
                  placeholder="Optional"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormError("") }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? "Erstellen..." : "Erstellen"}
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
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
