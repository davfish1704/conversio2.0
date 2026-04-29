"use client"

import { useEffect, useState } from "react"
import { Users, MessageSquare, Clock, Calendar, Snowflake, AlertCircle } from "lucide-react"

interface BoardLead {
  createdAt: string
  lastMessageAt: string
  frozen?: boolean
  messages: { direction: string }[]
}

interface StatsData {
  activeConversations: number
  needsReply: number
  messagesToday: number
  conversationsThisWeek: number
}

interface StatCardProps {
  label: string
  value: number
  subtext: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

interface StatsBarProps {
  /** When provided, stats are derived from this board's leads (no API call). */
  boardLeads?: BoardLead[]
}

function StatCard({ label, value, subtext, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{subtext}</p>
      </div>
    </div>
  )
}

function deriveStatsFromLeads(leads: BoardLead[]): StatsData {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    activeConversations: leads.length,
    needsReply: leads.filter((l) => l.messages[0]?.direction === "INBOUND").length,
    messagesToday: leads.filter((l) => new Date(l.createdAt) >= todayStart).length,
    conversationsThisWeek: leads.filter((l) => new Date(l.lastMessageAt) >= weekStart).length,
  }
}

export default function StatsBar({ boardLeads }: StatsBarProps = {}) {
  const [apiStats, setApiStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(boardLeads === undefined)

  useEffect(() => {
    // Only fetch from API when no board-specific leads are provided
    if (boardLeads !== undefined) return

    let isMounted = true
    async function loadStats() {
      try {
        const res = await fetch("/api/conversations/stats")
        if (!res.ok) throw new Error("Failed")
        const data = await res.json()
        if (isMounted) setApiStats(data)
      } catch {
        // silent fail
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadStats()
    return () => { isMounted = false }
  }, [boardLeads])

  const data: StatsData = boardLeads !== undefined
    ? deriveStatsFromLeads(boardLeads)
    : (apiStats || { activeConversations: 0, needsReply: 0, messagesToday: 0, conversationsThisWeek: 0 })

  const frozenCount = boardLeads ? boardLeads.filter((l) => l.frozen).length : 0
  const inactiveCount = boardLeads
    ? (() => {
        const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return boardLeads.filter((l) => new Date(l.lastMessageAt) < weekStart).length
      })()
    : 0

  const cards = [
    {
      label: "Active Leads",
      value: data.activeConversations,
      subtext: "in this board",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: "New Today",
      value: data.messagesToday,
      subtext: "created since midnight",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      label: "Needs Reply",
      value: data.needsReply,
      subtext: "last message inbound",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: "Active This Week",
      value: data.conversationsThisWeek,
      subtext: "message in last 7 days",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      label: "Frozen",
      value: frozenCount,
      subtext: "manual takeover active",
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      icon: <Snowflake className="w-5 h-5" />,
    },
    {
      label: "Inactive",
      value: inactiveCount,
      subtext: "no activity in 7+ days",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      icon: <AlertCircle className="w-5 h-5" />,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse mb-3" />
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-28 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}
