"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, useRouter } from "next/navigation"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import BoardTabs from "@/components/boards/BoardTabs"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

export default function BoardSettingsPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardName, setBoardName] = useState("")
  const [boardDesc, setBoardDesc] = useState("")
  const [boardActive, setBoardActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => r.json())
      .then(data => {
        const b = data.board || data
        setBoard(b)
        setBoardName(b.name || "")
        setBoardDesc(b.description || "")
        setBoardActive(b.isActive ?? true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName, description: boardDesc, isActive: boardActive }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Einstellungen gespeichert" })
      setBoard(prev => prev ? { ...prev, name: boardName, description: boardDesc, isActive: boardActive } : null)
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/boards/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Board deleted" })
      router.push("/dashboard")
    } catch {
      toast({ title: "Failed to delete board", variant: "destructive" })
      setDeleting(false)
    }
  }

  if (loading) return <BoardSkeleton />
  if (!board) return <div className="p-8 text-center text-gray-500">Board not found</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <BoardTabs board={board} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("settings.boardSettings")}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("common.name")}</label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("common.description")}</label>
            <textarea
              value={boardDesc}
              onChange={(e) => setBoardDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={boardActive}
              onChange={(e) => setBoardActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("board.active")}</label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t("common.saving") : t("settings.saveChanges")}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-6">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">{t("board.dangerZone")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("board.deleteWarning")}</p>
          <button
            onClick={() => setShowDelete(true)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t("board.deleteBoard")}
          </button>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("board.deleteBoard")}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t("board.deleteConfirm")} <strong>{board.name}</strong>? {t("board.deleteConfirm2")}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t("common.deleting") : t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
