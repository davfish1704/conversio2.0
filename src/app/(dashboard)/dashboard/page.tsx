"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus,
  Kanban,
  Users,
  BarChart3,
  TrendingUp,
  Zap,
  MessageSquare,
  Bot,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  _count?: { states: number; members: number; conversations: number }
}

function StatCard({ icon: Icon, label, value, sub, subGreen }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; subGreen?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-text-secondary mb-0.5">{label}</p>
            <p className="text-xl font-semibold tabular-nums text-text-primary">{value}</p>
            {sub && <p className={cn("text-[10px] mt-1", subGreen ? "text-success" : "text-text-tertiary")}>{sub}</p>}
          </div>
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BoardCard({ board, onIssues }: { board: Board; onIssues?: number }) {
  const channelIcons = [
    <MessageSquare key="wa" className="w-3 h-3 text-green-500" />,
    <Bot key="tg" className="w-3 h-3 text-sky-500" />,
  ]

  return (
    <Link href={`/boards/${board.id}`} className="group block">
      <Card className="h-full hover:border-primary/20 hover:shadow-sm transition-all duration-100 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                  {board.name}
                </span>
                {onIssues && onIssues > 0 ? (
                  <Badge variant="danger" className="shrink-0 text-[10px] px-1.5 py-0">{onIssues}</Badge>
                ) : null}
              </div>
              {board.description && (
                <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{board.description}</p>
              )}
            </div>
            <Badge variant={board.isActive ? "success" : "neutral"} className="shrink-0 text-[9px] px-1.5 py-0">
              {board.isActive ? "Aktiv" : "Inaktiv"}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-text-tertiary mb-2.5">
            <div className="flex items-center gap-1">
              <Kanban className="w-3 h-3" />
              {board._count?.states ?? 0} Phasen
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {board._count?.members ?? 1}
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {board._count?.conversations ?? 0} Leads
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              {channelIcons}
            </div>
            <span className="text-[10px] text-text-tertiary">
              {new Date(board.createdAt).toLocaleDateString("de-DE")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")

  const fetchBoards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/boards")
      if (!res.ok) throw new Error("Fehler beim Laden")
      const data = await res.json()
      setBoards(data.boards || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBoards() }, [fetchBoards])

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      })
      if (res.ok) {
        const data = await res.json()
        setBoards((prev) => [...prev, data.board])
        setModalOpen(false)
        setNewName("")
        setNewDesc("")
      } else {
        const d = await res.json().catch(() => ({}))
        setFormError(d.error || "Board konnte nicht erstellt werden")
      }
    } finally {
      setFormLoading(false)
    }
  }

  const activeBoards = boards.filter((b) => b.isActive)
  const totalLeads = boards.reduce((s, b) => s + (b._count?.conversations ?? 0), 0)

  return (
    <div className="px-6 py-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Kanban} label="Active Boards" value={activeBoards.length} sub={`${boards.length} total`} />
        <StatCard icon={Users} label="Total Leads" value={totalLeads} sub="board-übergreifend" />
        <StatCard icon={TrendingUp} label="Durchschn. Leads/Board" value={activeBoards.length > 0 ? Math.round(totalLeads / activeBoards.length) : 0} sub="pro aktivem Board" />
        <StatCard icon={Zap} label="KI-Verbrauch" value="—" sub="diesen Monat" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-text-primary">Boards</h1>
          <p className="text-xs text-text-secondary mt-0.5">{activeBoards.length} aktiv · {boards.length - activeBoards.length} inaktiv</p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Neues Board
        </Button>
      </div>

      {/* Board Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-3"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /><Skeleton className="h-3 w-14" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Verbindungsfehler</p>
            <p className="text-xs text-text-secondary mb-4">{error}</p>
            <Button size="xs" variant="secondary" onClick={fetchBoards}>Erneut laden</Button>
          </CardContent>
        </Card>
      ) : boards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
              <Kanban className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Noch kein Board</p>
            <p className="text-xs text-text-secondary mb-4">Erstelle dein erstes Board um Leads zu verwalten.</p>
            <Button size="xs" onClick={() => setModalOpen(true)}>
              <Plus className="w-3 h-3" />
              Board erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {boards.map((b) => <BoardCard key={b.id} board={b} />)}
        </div>
      )}

      {/* Create Board Dialog */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setFormError("") }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Neues Board</DialogTitle>
          </DialogHeader>
          <form onSubmit={createBoard} className="space-y-3 mt-1">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. Kfz-Leads Q3" required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="desc" className="text-xs">Beschreibung <span className="text-text-tertiary">(optional)</span></Label>
              <Textarea id="desc" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Kurze Beschreibung…" rows={2} className="resize-none" />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="xs" onClick={() => setModalOpen(false)}>Abbrechen</Button>
              <Button type="submit" size="xs" disabled={formLoading || !newName.trim()}>
                {formLoading ? "Wird erstellt…" : "Board erstellen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
