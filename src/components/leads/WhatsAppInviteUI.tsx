"use client"

import { useState, useEffect } from "react"
import { Copy, QrCode, Check, ExternalLink } from "lucide-react"

interface WhatsAppInviteUIProps {
  leadId: string
}

export default function WhatsAppInviteUI({ leadId }: WhatsAppInviteUIProps) {
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [startText, setStartText] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/leads/${leadId}/whatsapp-invite`)
      .then(r => r.json())
      .then(data => {
        if (data.deepLink) {
          setDeepLink(data.deepLink)
          setStartText(data.startText)
          setQrUrl(data.qrUrl)
        } else {
          setError(data.error || "Fehler beim Laden des Links")
        }
      })
      .catch(() => setError("Netzwerkfehler"))
      .finally(() => setLoading(false))
  }, [leadId])

  async function copyLink() {
    if (!deepLink) return
    await navigator.clipboard.writeText(deepLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function copyText() {
    if (!startText) return
    await navigator.clipboard.writeText(startText)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 h-full">
      <div className="text-center space-y-3 max-w-sm">
        <div className="inline-flex w-14 h-14 rounded-full bg-[#25D366]/10 items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Lead noch nicht erreichbar
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          WhatsApp-Bots dürfen nur mit Kunden schreiben, die zuerst eine Nachricht gesendet haben.
          Sende diesem Lead den Link oder den Start-Text — sobald er darauf reagiert, ist der Chat aktiv.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Generiere Link…</p>
      )}

      {error && (
        <div className="w-full max-w-sm p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-destructive/70 mt-1">Stelle sicher, dass WhatsApp in Board-Einstellungen → Kanäle verbunden ist.</p>
        </div>
      )}

      {deepLink && (
        <div className="w-full max-w-sm space-y-3">
          {/* wa.me deep link */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Klickbarer Link (wa.me)</p>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
              <code className="flex-1 text-xs text-foreground truncate">{deepLink}</code>
              <a
                href={deepLink}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Im Browser öffnen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={copyLink}
                className="shrink-0 px-3 py-1.5 bg-[#25D366] text-white text-xs rounded-lg hover:bg-[#1aad52] flex items-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Kopiert!" : "Kopieren"}
              </button>
            </div>
          </div>

          {/* Start <token> plain text for desktop / manual send */}
          {startText && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Start-Text (für manuellen Versand / Desktop)</p>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                <code className="flex-1 text-xs font-mono text-foreground">{startText}</code>
                <button
                  onClick={copyText}
                  className="shrink-0 px-3 py-1.5 bg-[#25D366] text-white text-xs rounded-lg hover:bg-[#1aad52] flex items-center gap-1.5 transition-colors"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText ? "Kopiert!" : "Kopieren"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Der Kunde schickt diesen Text als erste Nachricht an die Business-Nummer.
              </p>
            </div>
          )}

          {/* QR code toggle */}
          <button
            onClick={() => setShowQR(v => !v)}
            className="w-full px-4 py-2.5 border border-border rounded-lg hover:bg-muted flex items-center justify-center gap-2 text-sm text-foreground transition-colors"
          >
            <QrCode className="w-4 h-4" />
            QR-Code {showQR ? "ausblenden" : "anzeigen"}
          </button>

          {showQR && qrUrl && (
            <div className="p-4 bg-card border border-border rounded-lg flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="WhatsApp Einladung QR-Code" className="w-48 h-48" />
              <p className="text-xs text-muted-foreground">Per Kamera oder Screenshot teilen</p>
              <a
                href={qrUrl}
                download="whatsapp-invite-qr.png"
                className="inline-flex items-center px-3 py-1.5 text-xs border border-border text-foreground rounded-md hover:bg-muted transition-colors"
              >
                QR herunterladen
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
