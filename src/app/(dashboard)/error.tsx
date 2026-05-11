"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="bg-card border border-border rounded-xl p-10 max-w-md w-full text-center shadow-sm animate-fade-up">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Ein Fehler ist aufgetreten</h2>
        {error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md mb-6 break-all">
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
