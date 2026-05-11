"use client"

import { Suspense, useEffect, useState, useContext, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts"
import {
  Plus, TrendingUp, BarChart3, PieChart as PieIcon,
  ArrowLeft, Kanban, Users, Layers,
} from "lucide-react"
import { useTheme } from "@/lib/ThemeContext"
import { LanguageContext } from "@/lib/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/* ─── Types ──────────────────────────────────────────────── */

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

/* ─── Constants ──────────────────────────────────────────── */

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: "#22c55e",
  Facebook: "#4F83F7",
  Manuell:  "#94a3b8",
  unknown:  "#cbd5e1",
}

const STATUS_COLORS: Record<string, string> = {
  Aktiv:    "#22c55e",
  Pausiert: "#ef4444",
  CLOSED:   "#94a3b8",
  ARCHIVED: "#f59e0b",
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

/* ─── Sub-components ─────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  subGreen,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  subGreen?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {sub && (
              <p className={cn("text-xs mt-1.5", subGreen ? "text-success" : "text-muted-foreground")}>
                {sub}
              </p>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function BoardCard({ board }: { board: Board }) {
  return (
    <Link href={`/dashboard?board=${board.id}`} className="group block">
      <Card className="h-full hover:border-primary/20 hover:shadow-md transition-all duration-150 cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                {board.name}
              </p>
              {board.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {board.description}
                </p>
              )}
            </div>
            <Badge variant={board.isActive ? "success" : "muted"} className="shrink-0 mt-0.5">
              {board.isActive ? "Aktiv" : "Inaktiv"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { label: "Phasen", value: board._count?.states ?? 0 },
              { label: "Leads",  value: board._count?.conversations ?? 0 },
              { label: "Team",   value: board._count?.members ?? 0 },
            ].map((s) => (
              <div key={s.label} className="text-center px-3 first:pl-0 last:pr-0">
                <p className="text-[11px] text-muted-foreground mb-1">{s.label}</p>
                <p className="text-lg font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function BoardListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((j) => <Skeleton key={j} className="h-10 rounded-md" />)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card><CardContent className="p-5"><Skeleton className="h-[240px]" /></CardContent></Card>
        <Card><CardContent className="p-5"><Skeleton className="h-[240px]" /></CardContent></Card>
      </div>
      <Card><CardContent className="p-5"><Skeleton className="h-[200px]" /></CardContent></Card>
    </>
  )
}

/* ─── Main ───────────────────────────────────────────────── */

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const boardId = searchParams.get("board")
  const { t } = useContext(LanguageContext)
  const { theme } = useTheme()

  const chartCfg = useMemo(() => ({
    grid:    theme === "dark" ? "#1e2430" : "#f0f1f4",
    axis:    theme === "dark" ? "#4a5266" : "#b0b7c5",
    tooltip: theme === "dark"
      ? { borderRadius: "8px", border: "1px solid #1e2430", backgroundColor: "#0e1117", color: "#f0f2f5", fontSize: "12px", padding: "10px 14px" }
      : { borderRadius: "8px", border: "1px solid #e8eaed", backgroundColor: "#fff", fontSize: "12px", padding: "10px 14px" },
  }), [theme])

  const [boards, setBoards]           = useState<Board[]>([])
  const [boardStats, setBoardStats]   = useState<BoardStats | null>(null)
  const [loading, setLoading]         = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDesc, setNewBoardDesc] = useState("")
  const [formError, setFormError]     = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [boardsError, setBoardsError] = useState<string | null>(null)

  const selectedBoard = boards.find((b) => b.id === boardId) ?? null

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => { if (!r.ok) throw new Error("Failed to load boards"); return r.json() })
      .then((data) => { setBoards(data.boards || []); setBoardsError(null); setLoading(false) })
      .catch((err) => { setBoardsError(err.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!selectedBoard) { setBoardStats(null); return }
    setStatsLoading(true)
    fetch(`/api/boards/${selectedBoard.id}/pipeline`)
      .then((r) => r.json())
      .then((data) => {
        const allLeads: any[] = [
          ...(data.states || []).flatMap((s: any) => s.leads || []),
          ...(data.unassignedLeads || []),
        ]
        const dailyMap = new Map<string, number>()
        for (let i = 29; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i)
          dailyMap.set(d.toISOString().split("T")[0], 0)
        }
        allLeads.forEach((c) => {
          if (!c.createdAt) return
          const day = new Date(c.createdAt).toISOString().split("T")[0]
          if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
        })
        const channelMap = new Map<string, number>()
        allLeads.forEach((c) => {
          const src = c.source || "unknown"
          channelMap.set(src, (channelMap.get(src) || 0) + 1)
        })
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const activeCount  = allLeads.filter((c) => c.aiEnabled !== false && c.frozen !== true).length
        const frozenCount  = allLeads.filter((c) => c.frozen === true).length
        const statusMap    = new Map([["Aktiv", activeCount]])
        if (frozenCount > 0) statusMap.set("Pausiert", frozenCount)

        setBoardStats({
          daily: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
          channel: Array.from(channelMap.entries()).map(([name, value]) => ({
            name: name === "whatsapp" ? "WhatsApp" : name === "facebook" ? "Facebook" : name === "manual" ? "Manuell" : name,
            value,
          })),
          status: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
          totalLeads: allLeads.length,
          activeLeads: activeCount,
          newThisWeek: allLeads.filter((c) => c.createdAt && new Date(c.createdAt) >= sevenDaysAgo).length,
        })
      })
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [selectedBoard?.id])

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName, description: newBoardDesc }),
      })
      if (res.ok) {
        const data = await res.json()
        setBoards((prev) => [...prev, data.board])
        setIsModalOpen(false)
        setNewBoardName("")
        setNewBoardDesc("")
      } else {
        const d = await res.json().catch(() => ({}))
        setFormError(d.error || t("dashboard.boardCreateError") || "Board konnte nicht erstellt werden.")
      }
    } finally {
      setFormLoading(false)
    }
  }

  const activeBoards = boards.filter((b) => b.isActive)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {selectedBoard && (
            <Button variant="ghost" size="icon-sm" onClick={() => router.push("/dashboard")} aria-label="Zurück">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">
              {selectedBoard ? selectedBoard.name : "Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedBoard
                ? `${boardStats?.totalLeads ?? 0} Leads · ${boardStats?.activeLeads ?? 0} aktiv`
                : `${boards.length} Board${boards.length !== 1 ? "s" : ""} · ${activeBoards.length} aktiv`}
            </p>
          </div>
          {selectedBoard && (
            <Badge variant={selectedBoard.isActive ? "success" : "muted"} className="shrink-0">
              {selectedBoard.isActive ? "Aktiv" : "Inaktiv"}
            </Badge>
          )}
        </div>

        {selectedBoard ? (
          <Button size="sm" asChild>
            <Link href={`/boards/${selectedBoard.id}`}>
              <Kanban className="w-4 h-4" />
              Pipeline öffnen
            </Link>
          </Button>
        ) : (
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Neues Board
          </Button>
        )}
      </div>

      {/* ── Board list ──────────────────────────────────────── */}
      {!selectedBoard && (
        loading ? (
          <BoardListSkeleton />
        ) : boardsError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
              <Kanban className="w-5 h-5 text-destructive" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-destructive">Verbindungsfehler</p>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Boards konnten nicht geladen werden. Bitte versuchen Sie es erneut.
            </p>
            <Button size="sm" variant="outline" onClick={() => { setLoading(true); setBoardsError(null); fetch("/api/boards").then(r => r.json()).then(d => { setBoards(d.boards || []); setLoading(false) }).catch(e => { setBoardsError(e.message); setLoading(false) }) }}>
              Erneut laden
            </Button>
          </div>
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Kanban className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium">Noch kein Board</p>
            <p className="text-xs text-muted-foreground mt-1 mb-5">
              Erstellen Sie Ihr erstes Board um Leads zu verwalten.
            </p>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Neues Board erstellen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => <BoardCard key={b.id} board={b} />)}
          </div>
        )
      )}

      {/* ── Board stats ─────────────────────────────────────── */}
      {selectedBoard && (
        statsLoading ? (
          <StatsSkeleton />
        ) : boardStats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={BarChart3} label="Leads gesamt" value={boardStats.totalLeads}
                sub={`+${boardStats.newThisWeek} diese Woche`} subGreen={boardStats.newThisWeek > 0} />
              <StatCard icon={TrendingUp} label="Aktiv" value={boardStats.activeLeads}
                sub={boardStats.totalLeads > 0
                  ? `${Math.round((boardStats.activeLeads / boardStats.totalLeads) * 100)}% vom Gesamt`
                  : "0%"} />
              <StatCard icon={Layers} label="Phasen" value={selectedBoard._count?.states ?? 0} sub="Pipeline-Phasen" />
              <StatCard icon={Users}   label="Team"   value={selectedBoard._count?.members ?? 0} sub="Teammitglieder" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ChartCard icon={BarChart3} title="Lead-Volumen (30 Tage)">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={boardStats.daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4F83F7" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4F83F7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartCfg.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} stroke={chartCfg.axis}
                      tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={6} />
                    <YAxis stroke={chartCfg.axis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartCfg.tooltip} />
                    <Area type="monotone" dataKey="count" name="Leads" stroke="#4F83F7"
                      strokeWidth={1.5} fillOpacity={1} fill="url(#gradLeads)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard icon={PieIcon} title="Nach Kanal">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={boardStats.channel} cx="50%" cy="50%"
                      innerRadius={58} outerRadius={82} paddingAngle={3} dataKey="value">
                      {boardStats.channel.map((entry, i) => (
                        <Cell key={i} fill={CHANNEL_COLORS[entry.name] ?? CHANNEL_COLORS.unknown} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartCfg.tooltip} />
                    <Legend wrapperStyle={{ fontSize: "11px" }}
                      formatter={(v) => <span style={{ color: theme === "dark" ? "#94a3b8" : "#64748b" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard icon={BarChart3} title="Status-Übersicht">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={boardStats.status} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartCfg.grid} vertical={false} />
                  <XAxis dataKey="name" stroke={chartCfg.axis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke={chartCfg.axis} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartCfg.tooltip} />
                  <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {boardStats.status.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : null
      )}

      {/* ── Create board dialog ──────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={(o) => { setIsModalOpen(o); if (!o) setFormError("") }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Neues Board erstellen</DialogTitle>
          </DialogHeader>
          <form onSubmit={createBoard} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="board-name">Name</Label>
              <Input id="board-name" value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="z. B. Kfz-Leads Q3" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-desc">
                Beschreibung{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea id="board-desc" value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="Kurze Beschreibung des Boards…" rows={3} className="resize-none" />
            </div>
            {formError && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setIsModalOpen(false); setFormError("") }}>
                Abbrechen
              </Button>
              <Button type="submit" size="sm" disabled={formLoading || !newBoardName.trim()}>
                {formLoading ? "Wird erstellt…" : "Board erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Export ─────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <BoardListSkeleton />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
