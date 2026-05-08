"use client"

import { useState } from "react"
import { MailWarning, X, RefreshCw } from "lucide-react"

export default function EmailVerificationBanner() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function resend() {
    setSending(true)
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300">
        <MailWarning className="w-4 h-4 flex-shrink-0" />
        <span>
          {sent
            ? "Bestätigungslink verschickt — bitte prüfe dein Postfach."
            : "Bitte bestätige deine E-Mail-Adresse."}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!sent && (
          <button
            onClick={resend}
            disabled={sending}
            className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${sending ? "animate-spin" : ""}`} />
            Erneut senden
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 dark:text-yellow-500 hover:text-yellow-900 dark:hover:text-yellow-200 transition"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
