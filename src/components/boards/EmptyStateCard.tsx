"use client"

import { useState, useEffect, useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"

interface EmptyStateCardProps {
  boardId: string
  onImportClick: () => void
}

export default function EmptyStateCard({ boardId, onImportClick }: EmptyStateCardProps) {
  const storageKey = `board_dismissed_${boardId}`
  const [dismissed, setDismissed] = useState(false)
  const { t } = useContext(LanguageContext)

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "true")
  }, [storageKey])

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true")
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 transition p-1"
        title={t("emptyState.hide")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{t("leadImport.importLeads")}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t("emptyState.noLeadsYet")}
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={onImportClick}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              {t("emptyState.uploadCSV")}
            </button>
            <button
              onClick={onImportClick}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              {t("emptyState.showAPI")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
