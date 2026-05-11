"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="bg-card border border-border rounded-xl p-10 max-w-md w-full text-center shadow-sm animate-fade-up">
        <p className="text-5xl font-bold text-muted-foreground/30 mb-4 tabular-nums">404</p>
        <h2 className="text-lg font-semibold text-foreground mb-2">Seite nicht gefunden</h2>
        <p className="text-sm text-muted-foreground mb-7">
          Diese Seite existiert nicht oder du hast keinen Zugriff darauf.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </button>
        </div>
      </div>
    </div>
  )
}
