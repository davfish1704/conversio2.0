"use client"

import { useState, useEffect, useContext } from "react"
import { X, Users } from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"
import { Button } from "@/components/ui/button"

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
    <div className="relative bg-primary/5 border border-primary/15 rounded-lg p-5 mb-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={t("emptyState.hide")}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
          <Users className="w-4.5 h-4.5 text-primary" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-semibold text-foreground">{t("leadImport.importLeads")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("emptyState.noLeadsYet")}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onImportClick}>
              {t("emptyState.uploadCSV")}
            </Button>
            <Button size="sm" variant="outline" onClick={onImportClick}>
              {t("emptyState.showAPI")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
