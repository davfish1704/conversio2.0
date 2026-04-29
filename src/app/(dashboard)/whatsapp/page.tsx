'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FEATURES } from '@/lib/features'

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PAUSED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Verbunden",
  PENDING: "Ausstehend",
  PAUSED: "Pausiert",
  ERROR: "Fehler",
}

export default function WhatsAppSettings() {
  const [account, setAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editPhone, setEditPhone] = useState("")
  const [editToken, setEditToken] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!FEATURES.whatsapp) {
      router.replace('/dashboard')
      return
    }
    fetch('/api/whatsapp/account')
      .then(r => r.json())
      .then(data => {
        setAccount(data)
        setLoading(false)
      })
  }, [router])

  const disconnect = async () => {
    setDisconnecting(true)
    await fetch('/api/whatsapp/disconnect', { method: 'POST' })
    setDisconnecting(false)
    router.push('/settings')
    router.refresh()
  }

  const startEdit = () => {
    setEditPhone(account?.phoneNumber || "")
    setEditToken("")
    setSaveError("")
    setEditing(true)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch('/api/whatsapp/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: editPhone, accessToken: editToken || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || "Fehler beim Speichern")
        return
      }
      setAccount(data)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (!FEATURES.whatsapp) return null

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Wird geladen...</div>

  const statusKey = account?.status as string
  const badgeClass = STATUS_BADGE[statusKey] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  const badgeLabel = STATUS_LABEL[statusKey] ?? statusKey

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">WhatsApp Business Einstellungen</h1>

      {account ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {editing ? (
            <form onSubmit={saveEdit}>
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Nummer bearbeiten</h2>
              {saveError && (
                <p className="mb-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Telefonnummer (Phone Number ID)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="z.B. 123456789"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Access Token <span className="text-gray-400 dark:text-gray-500 font-normal">(leer lassen = unverändert)</span>
                </label>
                <input
                  type="password"
                  value={editToken}
                  onChange={e => setEditToken(e.target.value)}
                  placeholder="EAA..."
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Verbundenes Konto</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">Nummer: {account.phoneNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
                  {badgeLabel}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={startEdit}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm font-medium"
                >
                  Nummer bearbeiten
                </button>
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                >
                  {disconnecting ? 'Wird getrennt...' : 'Verbindung trennen'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">WhatsApp Business verbinden</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Zugangsdaten der WhatsApp Business API eingeben:</p>

          <form onSubmit={async (e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const data = {
              phoneNumber: (form.elements.namedItem('phone') as HTMLInputElement).value,
              accessToken: (form.elements.namedItem('token') as HTMLInputElement).value,
            }
            const res = await fetch('/api/whatsapp/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            })
            if (res.ok) {
              const updated = await fetch('/api/whatsapp/account').then(r => r.json())
              setAccount(updated)
            }
          }}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Phone Number ID
              </label>
              <input
                name="phone"
                type="text"
                placeholder="123456789"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Access Token
              </label>
              <input
                name="token"
                type="password"
                placeholder="EAA..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium">
              Verbinden
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
