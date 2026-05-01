"use client"

import { useState } from "react"
import { Copy, Check, QrCode } from "lucide-react"

interface ChannelInviteUIProps {
  invite: {
    token: string
    deepLink: string
    qrUrl: string
    expiresAt: string
  }
  channel: string
}

const CHANNEL_META: Record<string, { label: string; colorClass: string; bgClass: string; icon: React.ReactNode }> = {
  telegram: {
    label: "Telegram",
    colorClass: "text-[#2AABEE]",
    bgClass: "bg-[#2AABEE]/10",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z" />
      </svg>
    ),
  },
  whatsapp: {
    label: "WhatsApp",
    colorClass: "text-green-600",
    bgClass: "bg-green-600/10",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    colorClass: "text-pink-500",
    bgClass: "bg-pink-500/10",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
}

function daysUntil(isoDate: string): number {
  const ms = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export default function ChannelInviteUI({ invite, channel }: ChannelInviteUIProps) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const meta = CHANNEL_META[channel] ?? {
    label: channel.charAt(0).toUpperCase() + channel.slice(1),
    colorClass: "text-gray-600",
    bgClass: "bg-gray-100",
    icon: null,
  }

  const days = daysUntil(invite.expiresAt)

  async function copyLink() {
    await navigator.clipboard.writeText(invite.deepLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`inline-flex w-10 h-10 rounded-full ${meta.bgClass} ${meta.colorClass} items-center justify-center shrink-0`}>
          {meta.icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{meta.label}-Einladung</p>
          <p className="text-xs text-gray-500">
            {days > 0 ? `Gültig noch ${days} Tag${days !== 1 ? "e" : ""}` : "Abgelaufen"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <code className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{invite.deepLink}</code>
        <button
          onClick={copyLink}
          className={`shrink-0 px-3 py-1.5 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
            meta.colorClass === "text-[#2AABEE]" ? "bg-[#2AABEE] hover:bg-[#1a9cde]" :
            meta.colorClass === "text-green-600" ? "bg-green-600 hover:bg-green-700" :
            "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
      </div>

      <button
        onClick={() => setShowQr((v) => !v)}
        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 text-sm text-gray-700 dark:text-gray-300 transition-colors"
      >
        <QrCode className="w-4 h-4" />
        QR-Code {showQr ? "ausblenden" : "anzeigen"}
      </button>

      {showQr && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={invite.qrUrl} alt={`${meta.label} invite QR`} className="w-40 h-40" />
          <p className="text-xs text-gray-400">Per Kamera oder Screenshot teilen</p>
        </div>
      )}
    </div>
  )
}
