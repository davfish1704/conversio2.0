import Link from "next/link"
import { Home } from "lucide-react"

export const metadata = {
  title: "Seite nicht gefunden — Conversio",
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-up">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-bold text-primary">?</span>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-3 tabular-nums">404</h1>
        <p className="text-base font-medium text-foreground mb-2">Seite nicht gefunden</p>
        <p className="text-sm text-muted-foreground mb-8">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Zum Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
