"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, CheckCheck, AlertTriangle, Clock, Cpu } from "lucide-react"

interface AdminNotification {
  id: string
  type: "FAILED_JOB" | "LEAD_STUCK" | "SYSTEM_ERROR"
  title: string
  body: string
  read: boolean
  boardId: string | null
  leadId: string | null
  jobId: string | null
  createdAt: string
}

const TYPE_ICON = {
  FAILED_JOB: Cpu,
  LEAD_STUCK: Clock,
  SYSTEM_ERROR: AlertTriangle,
}

const TYPE_COLOR = {
  FAILED_JOB: "text-red-600 bg-red-50 dark:bg-red-900/20",
  LEAD_STUCK: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
  SYSTEM_ERROR: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })
}

export default function AdminNotificationsContent() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("unread")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications${filter === "unread" ? "?unread=true" : ""}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchData() }, [fetchData])

  async function markAllRead() {
    await fetch("/api/admin/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    fetchData()
  }

  async function markRead(id: string) {
    await fetch("/api/admin/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Benachrichtigungen
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Systemfehler, fehlgeschlagene Jobs und hängende Leads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(["unread", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {f === "unread" ? "Ungelesen" : "Alle"}
              </button>
            ))}
          </div>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Alle als gelesen
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{filter === "unread" ? "Keine ungelesenen Benachrichtigungen." : "Keine Benachrichtigungen."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type]
            return (
              <div
                key={n.id}
                className={`bg-card rounded-xl border border-border p-4 flex gap-4 ${!n.read ? "border-l-4 border-l-primary" : ""}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLOR[n.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{fmtDate(n.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{n.body}</p>
                  {(n.boardId || n.leadId || n.jobId) && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {n.boardId && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">board:{n.boardId.slice(0, 8)}</span>}
                      {n.leadId && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">lead:{n.leadId.slice(0, 8)}</span>}
                      {n.jobId && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">job:{n.jobId.slice(0, 8)}</span>}
                    </div>
                  )}
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    title="Als gelesen markieren"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
