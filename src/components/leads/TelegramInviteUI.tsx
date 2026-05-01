"use client"

import { useState, useEffect } from "react"
import { Copy, QrCode, Check, Send } from "lucide-react"

interface TelegramInviteUIProps {
  leadId: string
}

export default function TelegramInviteUI({ leadId }: TelegramInviteUIProps) {
  const [link, setLink] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/leads/${leadId}/telegram-invite`)
      .then(r => r.json())
      .then(data => {
        if (data.link) setLink(data.link)
        else setError(data.error || "Fehler beim Laden des Links")
      })
      .catch(() => setError("Netzwerkfehler"))
      .finally(() => setLoading(false))
  }, [leadId])

  async function generateQR() {
    if (!link) return
    setShowQR(true)
    if (qrDataUrl) return

    // Generate QR via canvas — uses the free qrserver.com API only if we have the link
    // We encode the link as an image URL param (no tracking, just image generation)
    const encoded = encodeURIComponent(link)
    setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`)
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 h-full">
      <div className="text-center space-y-3 max-w-sm">
        <div className="inline-flex w-14 h-14 rounded-full bg-[#2AABEE]/10 items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-[#2AABEE]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Lead noch nicht erreichbar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Telegram-Bots dürfen nur mit Leads schreiben, die dem Bot zuerst eine Nachricht gesendet haben.
          Sende diesem Lead den Einladungslink — sobald er darauf klickt und Telegram öffnet, ist der Chat aktiv.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-400">Generiere Link…</p>
      )}

      {error && (
        <div className="w-full max-w-sm p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-red-400 mt-1">Stelle sicher, dass Telegram in Board-Einstellungen → Kanäle verbunden ist.</p>
        </div>
      )}

      {link && (
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <code className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{link}</code>
            <button
              onClick={copyLink}
              className="shrink-0 px-3 py-1.5 bg-[#2AABEE] text-white text-xs rounded-lg hover:bg-[#1a9cde] flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>

          <button
            onClick={generateQR}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            QR-Code anzeigen
          </button>

          {showQR && qrDataUrl && (
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Telegram invite QR" className="w-48 h-48" />
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Send className="w-3 h-3" />
                Per Kamera oder Screenshot teilen
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
