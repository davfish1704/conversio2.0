"use client"

import { useEffect, useState, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"

type Report = {
  id: string
  boardName: string
  stateName: string | null
  type: string
  message: string
  status: string
  createdAt: string
}

export default function AdminBotContent() {
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{scanned: number, created: number} | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")

  const fetchReports = () => {
    setLoading(true)
    fetch("/api/admin/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch("/api/admin/scan", { method: "POST" })
      const result = await res.json()
      if (res.ok) {
        setScanResult({ scanned: result.scanned, created: result.created })
        fetchReports() // Refresh list
      } else {
        toast({ title: "Scan fehlgeschlagen", description: result.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Netzwerkfehler beim Scan", variant: "destructive" })
    } finally {
      setScanning(false)
    }
  }

  const resolveReport = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: "PUT" })
      if (res.ok) {
        setReports(reports.map((r) => (r.id === id ? { ...r, status: "RESOLVED" } : r)))
      }
    } catch {
      toast({ title: "Fehler beim Auflösen", variant: "destructive" })
    }
  }

  const deleteReport = async (id: string) => {
    if (!confirm("Report dauerhaft löschen?")) return
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: "DELETE" })
      if (res.ok) {
        setReports(reports.filter((r) => r.id !== id))
      }
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" })
    }
  }

  const typeConfig: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    STUCK: { icon: "🚨", color: "text-red-700", bg: "bg-red-50", label: "Stuck" },
    LOOP: { icon: "🔄", color: "text-orange-700", bg: "bg-orange-50", label: "Loop" },
    ERROR: { icon: "❌", color: "text-red-700", bg: "bg-red-50", label: "Error" },
    MANUAL_INTERVENTION: { icon: "👋", color: "text-blue-700", bg: "bg-blue-50", label: "Manual" },
    ESCALATION: { icon: "⬆️", color: "text-purple-700", bg: "bg-purple-50", label: "Escalation" },
  }

  const statusConfig: Record<string, { color: string; bg: string }> = {
    OPEN: { color: "text-red-700", bg: "bg-red-100" },
    RESOLVED: { color: "text-green-700", bg: "bg-green-100" },
    IGNORED: { color: "text-gray-700", bg: "bg-gray-100" },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const openCount = reports.filter((r) => r.status === "OPEN").length
  const stuckCount = reports.filter((r) => r.type === "STUCK" && r.status === "OPEN").length
  const loopCount = reports.filter((r) => r.type === "LOOP" && r.status === "OPEN").length
  const errorCount = reports.filter((r) => r.type === "ERROR" && r.status === "OPEN").length
  const filteredReports = activeFilter === "all" ? reports : reports.filter((r) => r.status === activeFilter)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bot-Monitoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">KI-Überwachung und Gesprächsqualität</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
        >
          {scanning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Scannt...
            </>
          ) : (
            <>
              🔍 Probleme scannen
            </>
          )}
        </button>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Scan abgeschlossen: {scanResult.scanned} Gespräche geprüft, {scanResult.created} neue Reports erstellt
            </p>
          </div>
          <button
            onClick={() => setScanResult(null)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Offene Reports", value: openCount, color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" },
          { label: "Hänger", value: stuckCount, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" },
          { label: "Schleifen", value: loopCount, color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400" },
          { label: "Fehler", value: errorCount, color: "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm opacity-75">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {["all", "OPEN", "RESOLVED"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition ${
              activeFilter === filter
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {filter === "all" ? "Alle" : filter === "OPEN" ? "Offen" : "Gelöst"}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200">
            <p className="text-gray-500 dark:text-gray-400 mb-2">Noch keine Reports vorhanden.</p>
            <p className="text-sm text-gray-400">Klicke auf &quot;Probleme scannen&quot;, um deine Gespräche zu prüfen.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const typeInfo = typeConfig[report.type] || typeConfig.MANUAL_INTERVENTION
            const statusInfo = statusConfig[report.status] || statusConfig.OPEN

            return (
              <div
                key={report.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border-2 p-5 transition ${
                  report.status === "OPEN" ? "border-red-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                        {report.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {report.boardName} {report.stateName && `/ ${report.stateName}`}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{report.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {report.status === "OPEN" && (
                      <>
                        <button
                          onClick={() => resolveReport(report.id)}
                          className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition"
                        >
                          ✓ Lösen
                        </button>
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg transition"
                        >
                          Ignorieren
                        </button>
                      </>
                    )}
                    {report.status === "RESOLVED" && (
                      <span className="text-sm text-green-600 font-medium">✓ Gelöst</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
