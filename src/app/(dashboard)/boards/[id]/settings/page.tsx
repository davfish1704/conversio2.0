"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, useRouter } from "next/navigation"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import BoardTabs from "@/components/boards/BoardTabs"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"

interface Board {
  id: string
  name: string
  description: string | null
  isActive: boolean
  adminStatus?: string
  ownerStatus?: string
  behaviorMode?: string
}

interface BoardChannel {
  id: string
  platform: string
  status: string
  telegramBotUsername?: string | null
  waPhoneNumberId?: string | null
  connectedAt?: string | null
}

export default function BoardSettingsPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardName, setBoardName] = useState("")
  const [boardDesc, setBoardDesc] = useState("")
  const [boardActive, setBoardActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Channels
  const [channels, setChannels] = useState<BoardChannel[]>([])
  const [tgToken, setTgToken] = useState("")
  const [connectingTg, setConnectingTg] = useState(false)
  const [waPhone, setWaPhone] = useState("")
  const [waBiz, setWaBiz] = useState("")
  const [waToken, setWaToken] = useState("")
  const [waVerify, setWaVerify] = useState("")
  const [connectingWa, setConnectingWa] = useState(false)

  // Custom Fields
  interface CustomField { key: string; label: string; type: string; required: boolean; options?: string[] }
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [savingFields, setSavingFields] = useState(false)
  const [generatingFields, setGeneratingFields] = useState(false)
  const [previewFields, setPreviewFields] = useState<CustomField[] | null>(null)
  const [newField, setNewField] = useState<CustomField>({ key: "", label: "", type: "text", required: false })

  // AI Provider Config
  const [aiProvider, setAiProvider] = useState("groq")
  const [aiModel, setAiModel] = useState("llama-3.3-70b-versatile")
  const [aiFallbackProvider, setAiFallbackProvider] = useState("")
  const [aiFallbackModel, setAiFallbackModel] = useState("")
  const [savingAi, setSavingAi] = useState(false)
  const [providerModels, setProviderModels] = useState<Record<string, { label: string; models: { value: string; label: string }[] }>>({})

  // Acquisition Invites
  interface AcqInvite { id: string; token: string; deepLink: string; qrUrl: string; campaign: string | null; expiresAt: string; platform: string }
  interface AcqGenerated { deepLink: string; qrUrl: string; token: string; expiresAt: string; campaign: string | null }
  const [acqInvites, setAcqInvites] = useState<AcqInvite[]>([])
  const [acqCampaign, setAcqCampaign] = useState<Record<string, string>>({})
  const [acqGenerating, setAcqGenerating] = useState<Record<string, boolean>>({})
  const [acqGenerated, setAcqGenerated] = useState<Record<string, AcqGenerated>>({})

  const PROVIDER_COST_EST: Record<string, number> = {
    "llama-3.3-70b-versatile": 0.03,
    "llama-3.1-8b-instant": 0.003,
    "deepseek-chat": 0.06,
    "deepseek/deepseek-chat": 0.06,
    "gpt-4o-mini": 0.03,
    "gpt-4o": 0.5,
    "claude-sonnet-4-6": 0.9,
    "anthropic/claude-sonnet-4-6": 0.9,
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => r.json())
      .then(data => {
        const b = data.board || data
        setBoard(b)
        setBoardName(b.name || "")
        setBoardDesc(b.description || "")
        setBoardActive(b.isActive ?? true)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch(`/api/boards/${id}/channels`)
      .then(r => r.json())
      .then(data => setChannels(data.channels || []))
      .catch(() => {})

    fetch(`/api/boards/${id}/ai-config`)
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setAiProvider(data.config.defaultProvider || "groq")
          setAiModel(data.config.defaultModel || "llama-3.3-70b-versatile")
          setAiFallbackProvider(data.config.fallbackProvider || "")
          setAiFallbackModel(data.config.fallbackModel || "")
        }
        if (data.providers) setProviderModels(data.providers)
      })
      .catch(() => {})

    fetch(`/api/boards/${id}/custom-fields`)
      .then(r => r.json())
      .then(data => setCustomFields(data.fields || []))
      .catch(() => {})

    fetch(`/api/boards/${id}/acquisition-invite`)
      .then(r => r.json())
      .then(data => setAcqInvites(data.invites || []))
      .catch(() => {})
  }, [id])

  const saveCustomFields = async (fields: typeof customFields) => {
    setSavingFields(true)
    try {
      const res = await fetch(`/api/boards/${id}/custom-fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      })
      if (!res.ok) throw new Error()
      setCustomFields(fields)
      toast({ title: "Felder gespeichert" })
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" })
    } finally {
      setSavingFields(false)
    }
  }

  const generateCustomFields = async () => {
    setGeneratingFields(true)
    try {
      const res = await fetch(`/api/boards/${id}/custom-fields/generate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.fields?.length) {
        toast({ title: "Keine Felder generiert — füge zuerst KI-States mit Missionen hinzu.", variant: "destructive" })
        return
      }
      // Filter out already-existing keys
      const existingKeys = new Set(customFields.map(f => f.key))
      const newOnes = data.fields.filter((f: CustomField) => !existingKeys.has(f.key))
      setPreviewFields(newOnes)
    } catch {
      toast({ title: "Generierung fehlgeschlagen", variant: "destructive" })
    } finally {
      setGeneratingFields(false)
    }
  }

  const mergePreviewFields = async () => {
    if (!previewFields) return
    const merged = [...customFields, ...previewFields]
    await saveCustomFields(merged)
    setPreviewFields(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName, description: boardDesc, isActive: boardActive }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Einstellungen gespeichert" })
      setBoard(prev => prev ? { ...prev, name: boardName, description: boardDesc, isActive: boardActive } : null)
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveAiConfig = async () => {
    setSavingAi(true)
    try {
      const res = await fetch(`/api/boards/${id}/ai-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: aiProvider,
          defaultModel: aiModel,
          fallbackProvider: aiFallbackProvider || null,
          fallbackModel: aiFallbackModel || null,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "KI-Konfiguration gespeichert" })
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" })
    } finally {
      setSavingAi(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/boards/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Board gelöscht" })
      router.push("/dashboard")
    } catch {
      toast({ title: "Board konnte nicht gelöscht werden", variant: "destructive" })
      setDeleting(false)
    }
  }

  const reloadChannels = () => {
    fetch(`/api/boards/${id}/channels`)
      .then(r => r.json())
      .then(data => setChannels(data.channels || []))
  }

  const formatAcqDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
  }

  const daysLeft = (iso: string) => Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 86400000))

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Link kopiert!" })
  }

  const generateAcqInvite = async (channelId: string) => {
    setAcqGenerating(prev => ({ ...prev, [channelId]: true }))
    try {
      const campaign = acqCampaign[channelId]?.trim() || undefined
      const res = await fetch(`/api/boards/${id}/acquisition-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetChannelId: channelId, campaign }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || "Fehler beim Generieren", variant: "destructive" })
        return
      }
      setAcqGenerated(prev => ({ ...prev, [channelId]: data }))
      setAcqInvites(prev => [{
        id: `tmp-${Date.now()}`,
        token: data.token,
        deepLink: data.deepLink,
        qrUrl: data.qrUrl,
        campaign: data.campaign ?? null,
        expiresAt: data.expiresAt,
        platform: channels.find(c => c.id === channelId)?.platform ?? "",
      }, ...prev])
    } catch {
      toast({ title: "Fehler beim Generieren", variant: "destructive" })
    } finally {
      setAcqGenerating(prev => ({ ...prev, [channelId]: false }))
    }
  }

  const connectTelegram = async () => {
    if (!tgToken.trim()) return
    setConnectingTg(true)
    try {
      const res = await fetch(`/api/boards/${id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect-telegram", token: tgToken.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || "Verbindung fehlgeschlagen", variant: "destructive" }); return }
      toast({ title: `Telegram @${data.channel.telegramBotUsername} verbunden` })
      setTgToken("")
      reloadChannels()
    } finally {
      setConnectingTg(false)
    }
  }

  const disconnectTelegram = async () => {
    setConnectingTg(true)
    try {
      await fetch(`/api/boards/${id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect-telegram" }),
      })
      toast({ title: "Telegram getrennt" })
      reloadChannels()
    } finally {
      setConnectingTg(false)
    }
  }

  const connectWhatsApp = async () => {
    if (!waPhone.trim() || !waToken.trim()) return
    setConnectingWa(true)
    try {
      const res = await fetch(`/api/boards/${id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect-whatsapp", phoneNumberId: waPhone, businessAccountId: waBiz, accessToken: waToken, verifyToken: waVerify }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || "Verbindung fehlgeschlagen", variant: "destructive" }); return }
      toast({ title: "WhatsApp verbunden" })
      setWaPhone(""); setWaBiz(""); setWaToken(""); setWaVerify("")
      reloadChannels()
    } finally {
      setConnectingWa(false)
    }
  }

  const tgChannel = channels.find(c => c.platform === "telegram")
  const waChannel = channels.find(c => c.platform === "whatsapp")

  if (loading) return <BoardSkeleton />
  if (!board) return <div className="p-8 text-center text-gray-500">Board not found</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <BoardTabs board={board} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Board Info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("settings.boardSettings")}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("common.name")}</label>
            <input type="text" value={boardName} onChange={e => setBoardName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("common.description")}</label>
            <textarea value={boardDesc} onChange={e => setBoardDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={boardActive} onChange={e => setBoardActive(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("board.active")}</label>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? t("common.saving") : t("settings.saveChanges")}
            </button>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">KI-Konfiguration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Welcher Anbieter und welches Modell für dieses Board verwendet wird</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Standard-Anbieter</label>
              <select
                value={aiProvider}
                onChange={e => {
                  setAiProvider(e.target.value)
                  const models = providerModels[e.target.value]?.models
                  if (models?.length) setAiModel(models[0].value)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(providerModels).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modell</label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(providerModels[aiProvider]?.models ?? []).map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {PROVIDER_COST_EST[aiModel] != null && (
            <p className="text-xs text-gray-400">
              ~{PROVIDER_COST_EST[aiModel].toFixed(3)} € pro 1.000 Nachrichten (Schätzung)
            </p>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fallback-Anbieter (optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={aiFallbackProvider}
                onChange={e => {
                  setAiFallbackProvider(e.target.value)
                  const models = providerModels[e.target.value]?.models
                  if (models?.length) setAiFallbackModel(models[0].value)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Kein Fallback —</option>
                {Object.entries(providerModels).filter(([k]) => k !== aiProvider).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              {aiFallbackProvider && (
                <select
                  value={aiFallbackModel}
                  onChange={e => setAiFallbackModel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(providerModels[aiFallbackProvider]?.models ?? []).map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button onClick={saveAiConfig} disabled={savingAi} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
            {savingAi ? "Speichern..." : "KI-Konfiguration speichern"}
          </button>
        </div>

        {/* Channel Connections */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kanäle verbinden</h2>

          {/* Telegram */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">✈️</span>
                <h3 className="font-medium text-gray-900 dark:text-white">Telegram Bot</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${tgChannel?.status === "connected" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                {tgChannel?.status === "connected" ? `@${tgChannel.telegramBotUsername}` : "Nicht verbunden"}
              </span>
            </div>
            {tgChannel?.status === "connected" ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Webhook: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{appUrl}/api/telegram/webhook/{id}</code></p>
                <button onClick={disconnectTelegram} disabled={connectingTg} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                  {connectingTg ? "..." : "Trennen"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Token von @BotFather eingeben</p>
                <div className="flex gap-2">
                  <input type="password" value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="1234567890:AAF..." className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={connectTelegram} disabled={connectingTg || !tgToken.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {connectingTg ? "..." : "Verbinden"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h3 className="font-medium text-gray-900 dark:text-white">WhatsApp Business</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${waChannel?.status === "connected" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                {waChannel?.status === "connected" ? `${waChannel.waPhoneNumberId}` : "Nicht verbunden"}
              </span>
            </div>
            {waChannel?.status === "connected" ? (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Webhook URL für Meta App: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{appUrl}/api/whatsapp/webhook/{id}</code></p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="Phone Number ID" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="text" value={waBiz} onChange={e => setWaBiz(e.target.value)} placeholder="Business Account ID" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="password" value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="Access Token" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="text" value={waVerify} onChange={e => setWaVerify(e.target.value)} placeholder="Verify Token (selbst wählen)" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={connectWhatsApp} disabled={connectingWa || !waPhone.trim() || !waToken.trim()} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {connectingWa ? "..." : "WhatsApp verbinden"}
                </button>
              </div>
            )}
          </div>

          {/* Instagram placeholder */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-lg">📸</span>
              <h3 className="font-medium text-gray-900 dark:text-white">Instagram</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Demnächst — Meta Approval ausstehend</span>
            </div>
          </div>
        </div>

        {/* Akquise-Links */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Akquise-Links</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Generiere Start-Links für Meta Ads, QR-Codes oder Direktversand</p>
          </div>

          {channels.filter(c => c.status === "connected" && ["telegram", "whatsapp"].includes(c.platform)).length === 0 && (
            <p className="text-sm text-gray-400 italic">Verbinde zuerst einen Kanal (Telegram oder WhatsApp), um Akquise-Links zu generieren.</p>
          )}

          {channels.filter(c => c.status === "connected" && ["telegram", "whatsapp"].includes(c.platform)).map(ch => {
            const label = ch.platform === "telegram"
              ? `Telegram${ch.telegramBotUsername ? ` — @${ch.telegramBotUsername}` : ""}`
              : `WhatsApp${ch.waPhoneNumberId ? ` — ${ch.waPhoneNumberId}` : ""}`
            const generated = acqGenerated[ch.id]
            const chInvites = acqInvites.filter(inv => inv.platform === ch.platform)

            return (
              <div key={ch.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">{label}</h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={acqCampaign[ch.id] ?? ""}
                    onChange={e => setAcqCampaign(prev => ({ ...prev, [ch.id]: e.target.value }))}
                    placeholder="Campaign (optional, z.B. meta_ad_mai)"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => generateAcqInvite(ch.id)}
                    disabled={!!acqGenerating[ch.id]}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {acqGenerating[ch.id] ? "..." : "Link generieren"}
                  </button>
                </div>

                {generated && (
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Link:</span>
                      <code className="flex-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded truncate">{generated.deepLink}</code>
                      <button
                        onClick={() => copyToClipboard(generated.deepLink)}
                        className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0"
                      >
                        Kopieren
                      </button>
                    </div>
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={generated.qrUrl} alt="QR-Code" width={96} height={96} className="rounded border border-gray-200 dark:border-gray-700" />
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gültig bis: {formatAcqDate(generated.expiresAt)}</p>
                        <a
                          href={generated.qrUrl}
                          download="acquisition-qr.png"
                          className="inline-block px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          QR Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {chInvites.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bestehende Links</p>
                    {chInvites.map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                        <code className="font-mono">{inv.token.slice(0, 8)}…</code>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span>{inv.campaign ?? "—"}</span>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span>⏰ {daysLeft(inv.expiresAt)}d</span>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Custom Fields */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Benutzerdefinierte Felder</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Felder, die in der Lead-Seitenleiste angezeigt werden</p>
            </div>
            <button
              onClick={generateCustomFields}
              disabled={generatingFields}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {generatingFields ? "⏳ Generiere..." : "🪄 Aus Mission generieren"}
            </button>
          </div>

          {/* Preview from AI */}
          {previewFields && previewFields.length > 0 && (
            <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20 space-y-3">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                {previewFields.length} neue Felder gefunden — bestehende Felder werden nicht überschrieben.
              </p>
              <div className="space-y-1">
                {previewFields.map(f => (
                  <div key={f.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-gray-400">({f.type})</span>
                    {f.required && <span className="text-red-400 text-xs">*</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={mergePreviewFields} disabled={savingFields} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  Übernehmen
                </button>
                <button onClick={() => setPreviewFields(null)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  Verwerfen
                </button>
              </div>
            </div>
          )}

          {/* Existing fields list */}
          {customFields.length > 0 && (
            <div className="space-y-2">
              {customFields.map((field, i) => (
                <div key={field.key} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</span>
                    <span className="ml-2 text-xs text-gray-400">{field.key} · {field.type}{field.required ? " *" : ""}</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = customFields.filter((_, idx) => idx !== i)
                      saveCustomFields(updated)
                    }}
                    className="text-xs text-red-500 hover:text-red-700 shrink-0"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}

          {customFields.length === 0 && !previewFields && (
            <p className="text-sm text-gray-400 italic">Noch keine Felder. Füge welche hinzu oder generiere sie aus den Flow-Missionen.</p>
          )}

          {/* Add new field inline */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Feld hinzufügen</p>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                value={newField.label}
                onChange={e => setNewField({ ...newField, label: e.target.value, key: newField.key || e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                placeholder="Label (z.B. Budget)"
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
              />
              <select
                value={newField.type}
                onChange={e => setNewField({ ...newField, type: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["text","number","date","select","multiselect","boolean","phone","email"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!newField.label.trim()) return
                  const field = { ...newField, key: newField.key || newField.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }
                  const updated = [...customFields, field]
                  saveCustomFields(updated)
                  setNewField({ key: "", label: "", type: "text", required: false })
                }}
                disabled={!newField.label.trim() || savingFields}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                + Hinzufügen
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-6">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">{t("board.dangerZone")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("board.deleteWarning")}</p>
          <button onClick={() => setShowDelete(true)} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t("board.deleteBoard")}</button>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("board.deleteBoard")}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t("board.deleteConfirm")} <strong>{board.name}</strong>? {t("board.deleteConfirm2")}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDelete(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("common.cancel")}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{deleting ? t("common.deleting") : t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
