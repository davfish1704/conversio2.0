"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, useRouter } from "next/navigation"
import BoardSkeleton from "@/components/boards/BoardSkeleton"
import BoardTabs from "@/components/boards/BoardTabs"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

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
  waPhoneNumber?: string | null
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
  const [waNumber, setWaNumber] = useState("")
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
  const [aiModel, setAiModel] = useState("gpt-4o-mini")
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

  const selectClass = "w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"

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
          setAiModel(data.config.defaultModel || "gpt-4o-mini")
          setAiFallbackProvider(data.config.fallbackProvider || "")
          setAiFallbackModel(data.config.fallbackModel || "")
        }
        if (data.providers) setProviderModels(data.providers)
      })
      .catch((err) => {
        console.warn(`[Settings] ai-config GET fehlgeschlagen für board ${id}:`, err)
      })

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
        method: "PUT",
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
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crm_last_board_id")
        if (stored === id) localStorage.removeItem("crm_last_board_id")
      }
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
        body: JSON.stringify({ action: "connect-whatsapp", phoneNumberId: waPhone, phoneNumber: waNumber || null, businessAccountId: waBiz, accessToken: waToken, verifyToken: waVerify }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || "Verbindung fehlgeschlagen", variant: "destructive" }); return }
      toast({ title: "WhatsApp verbunden" })
      setWaPhone(""); setWaNumber(""); setWaBiz(""); setWaToken(""); setWaVerify("")
      reloadChannels()
    } finally {
      setConnectingWa(false)
    }
  }

  const tgChannel = channels.find(c => c.platform === "telegram")
  const waChannel = channels.find(c => c.platform === "whatsapp")

  if (loading) return <BoardSkeleton />
  if (!board) return <div className="p-8 text-center text-muted-foreground text-sm">Board nicht gefunden</div>

  return (
    <div className="min-h-screen bg-background">
      <BoardTabs board={board} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Board Info */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{t("settings.boardSettings")}</h2>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("common.name")}</label>
            <Input value={boardName} onChange={e => setBoardName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("common.description")}</label>
            <textarea
              value={boardDesc}
              onChange={e => setBoardDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              checked={boardActive}
              onChange={e => setBoardActive(e.target.checked)}
              className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
            />
            <label className="text-sm text-foreground">{t("board.active")}</label>
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? t("common.saving") : t("settings.saveChanges")}
            </Button>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">KI-Konfiguration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Welcher Anbieter und welches Modell für dieses Board verwendet wird</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Standard-Anbieter</label>
              <select
                value={aiProvider}
                onChange={e => {
                  setAiProvider(e.target.value)
                  const models = providerModels[e.target.value]?.models
                  if (models?.length) setAiModel(models[0].value)
                }}
                className={selectClass}
              >
                {Object.entries(providerModels).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Modell</label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className={selectClass}
              >
                {(providerModels[aiProvider]?.models ?? []).map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {PROVIDER_COST_EST[aiModel] != null && (
            <p className="text-xs text-muted-foreground">
              ~{PROVIDER_COST_EST[aiModel].toFixed(3)} € pro 1.000 Nachrichten (Schätzung)
            </p>
          )}

          <div className="border-t border-border pt-4">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Fallback-Anbieter (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={aiFallbackProvider}
                onChange={e => {
                  setAiFallbackProvider(e.target.value)
                  const models = providerModels[e.target.value]?.models
                  if (models?.length) setAiFallbackModel(models[0].value)
                }}
                className={selectClass}
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
                  className={selectClass}
                >
                  {(providerModels[aiFallbackProvider]?.models ?? []).map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <Button size="sm" onClick={saveAiConfig} disabled={savingAi}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {savingAi ? "Speichern..." : "KI-Konfiguration speichern"}
          </Button>
        </div>

        {/* Channel Connections */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Kanäle verbinden</h2>

          {/* Telegram */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">✈️</span>
                <h3 className="text-sm font-medium text-foreground">Telegram Bot</h3>
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-md font-medium",
                tgChannel?.status === "connected"
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}>
                {tgChannel?.status === "connected" ? `@${tgChannel.telegramBotUsername}` : "Nicht verbunden"}
              </span>
            </div>
            {tgChannel?.status === "connected" ? (
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground">
                  Webhook: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{appUrl}/api/telegram/webhook/{id}</code>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectTelegram}
                  disabled={connectingTg}
                  className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                >
                  {connectingTg ? "…" : "Trennen"}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Token von @BotFather eingeben</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={tgToken}
                    onChange={e => setTgToken(e.target.value)}
                    placeholder="1234567890:AAF..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={connectTelegram} disabled={connectingTg || !tgToken.trim()}>
                    {connectingTg ? "…" : "Verbinden"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <h3 className="text-sm font-medium text-foreground">WhatsApp Business</h3>
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-md font-medium",
                waChannel?.status === "connected"
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}>
                {waChannel?.status === "connected" ? (waChannel.waPhoneNumber ?? waChannel.waPhoneNumberId ?? "verbunden") : "Nicht verbunden"}
              </span>
            </div>
            {waChannel?.status === "connected" ? (
              <div>
                <p className="text-xs text-muted-foreground">
                  Webhook URL für Meta App: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{appUrl}/api/whatsapp/webhook/{id}</code>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="Phone Number ID (Meta API)" />
                  <Input value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="Business-Nummer (+4915…)" />
                  <Input value={waBiz} onChange={e => setWaBiz(e.target.value)} placeholder="Business Account ID" />
                  <Input value={waVerify} onChange={e => setWaVerify(e.target.value)} placeholder="Verify Token (selbst wählen)" />
                  <Input type="password" value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="Access Token" className="col-span-2" />
                </div>
                <Button size="sm" onClick={connectWhatsApp} disabled={connectingWa || !waPhone.trim() || !waToken.trim()}>
                  {connectingWa ? "…" : "WhatsApp verbinden"}
                </Button>
              </div>
            )}
          </div>

          {/* Instagram placeholder */}
          <div className="border border-border rounded-lg p-4 opacity-50">
            <div className="flex items-center gap-2">
              <span className="text-base">📸</span>
              <h3 className="text-sm font-medium text-foreground">Instagram</h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">Demnächst — Meta Approval ausstehend</span>
            </div>
          </div>
        </div>

        {/* Akquise-Links */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Akquise-Links</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Generiere Start-Links für Meta Ads, QR-Codes oder Direktversand</p>
          </div>

          {channels.filter(c => c.status === "connected" && ["telegram", "whatsapp"].includes(c.platform)).length === 0 && (
            <p className="text-xs text-muted-foreground italic">Verbinde zuerst einen Kanal (Telegram oder WhatsApp), um Akquise-Links zu generieren.</p>
          )}

          {channels.filter(c => c.status === "connected" && ["telegram", "whatsapp"].includes(c.platform)).map(ch => {
            const label = ch.platform === "telegram"
              ? `Telegram${ch.telegramBotUsername ? ` — @${ch.telegramBotUsername}` : ""}`
              : `WhatsApp${ch.waPhoneNumber ? ` — ${ch.waPhoneNumber}` : ch.waPhoneNumberId ? ` — ${ch.waPhoneNumberId}` : ""}`
            const generated = acqGenerated[ch.id]
            const chInvites = acqInvites.filter(inv => inv.platform === ch.platform)

            return (
              <div key={ch.id} className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-xs font-semibold text-foreground">{label}</h3>

                <div className="flex gap-2">
                  <Input
                    value={acqCampaign[ch.id] ?? ""}
                    onChange={e => setAcqCampaign(prev => ({ ...prev, [ch.id]: e.target.value }))}
                    placeholder="Campaign (optional, z.B. meta_ad_mai)"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => generateAcqInvite(ch.id)}
                    disabled={!!acqGenerating[ch.id]}
                  >
                    {acqGenerating[ch.id] ? "…" : "Link generieren"}
                  </Button>
                </div>

                {generated && (
                  <div className="space-y-3 bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Link:</span>
                      <code className="flex-1 text-xs bg-background border border-border px-2 py-1 rounded-md font-mono truncate">{generated.deepLink}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generated.deepLink)}
                        className="shrink-0"
                      >
                        Kopieren
                      </Button>
                    </div>
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={generated.qrUrl} alt="QR-Code" width={80} height={80} className="rounded border border-border" />
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Gültig bis: {formatAcqDate(generated.expiresAt)}</p>
                        <a
                          href={generated.qrUrl}
                          download="acquisition-qr.png"
                          className="inline-flex items-center px-3 py-1.5 text-xs border border-border text-foreground rounded-md hover:bg-muted transition-colors"
                        >
                          QR Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {chInvites.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Bestehende Links</p>
                    {chInvites.map(inv => (
                      <div key={inv.id} className="flex items-center gap-2 text-xs p-2 bg-muted/30 rounded-md">
                        <code className="font-mono text-muted-foreground">{inv.token.slice(0, 8)}…</code>
                        <span className="text-border">|</span>
                        <span className="text-foreground">{inv.campaign ?? "—"}</span>
                        <span className="text-border">|</span>
                        <span className="text-muted-foreground">⏰ {daysLeft(inv.expiresAt)}d</span>
                        <span className="text-border">|</span>
                        <span className="text-success">✓</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Custom Fields */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Benutzerdefinierte Felder</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Felder, die in der Lead-Seitenleiste angezeigt werden</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={generateCustomFields}
              disabled={generatingFields}
              className="text-primary border-primary/20 hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="w-3 h-3 mr-1.5" />
              {generatingFields ? "Generiere…" : "Aus Mission generieren"}
            </Button>
          </div>

          {/* Preview from AI */}
          {previewFields && previewFields.length > 0 && (
            <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3">
              <p className="text-xs font-medium text-foreground">
                {previewFields.length} neue Felder gefunden — bestehende Felder werden nicht überschrieben.
              </p>
              <div className="space-y-1">
                {previewFields.map(f => (
                  <div key={f.key} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted-foreground">({f.type})</span>
                    {f.required && <span className="text-destructive">*</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={mergePreviewFields} disabled={savingFields}>Übernehmen</Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewFields(null)}>Verwerfen</Button>
              </div>
            </div>
          )}

          {/* Existing fields list */}
          {customFields.length > 0 && (
            <div className="space-y-1.5">
              {customFields.map((field, i) => (
                <div key={field.key} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">{field.label}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">{field.key} · {field.type}{field.required ? " *" : ""}</span>
                  </div>
                  <button
                    onClick={() => {
                      const updated = customFields.filter((_, idx) => idx !== i)
                      saveCustomFields(updated)
                    }}
                    className="text-xs text-destructive hover:text-destructive/80 shrink-0 transition-colors"
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}

          {customFields.length === 0 && !previewFields && (
            <p className="text-xs text-muted-foreground italic">Noch keine Felder. Füge welche hinzu oder generiere sie aus den Flow-Missionen.</p>
          )}

          {/* Add new field */}
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Feld hinzufügen</p>
            <div className="grid grid-cols-4 gap-2">
              <Input
                value={newField.label}
                onChange={e => setNewField({ ...newField, label: e.target.value, key: newField.key || e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                placeholder="Label (z.B. Budget)"
                className="col-span-2"
              />
              <select
                value={newField.type}
                onChange={e => setNewField({ ...newField, type: e.target.value })}
                className="px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {["text","number","date","select","multiselect","boolean","phone","email"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => {
                  if (!newField.label.trim()) return
                  const field = { ...newField, key: newField.key || newField.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") }
                  const updated = [...customFields, field]
                  saveCustomFields(updated)
                  setNewField({ key: "", label: "", type: "text", required: false })
                }}
                disabled={!newField.label.trim() || savingFields}
              >
                + Hinzufügen
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card rounded-xl border border-destructive/20 p-5">
          <h3 className="text-sm font-semibold text-destructive">{t("board.dangerZone")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("board.deleteWarning")}</p>
          <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)} className="mt-4">
            {t("board.deleteBoard")}
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("board.deleteBoard")}?</h3>
              <button
                onClick={() => setShowDelete(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("board.deleteConfirm")} <strong className="text-foreground">{board.name}</strong>? {t("board.deleteConfirm2")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDelete(false)} className="flex-1">
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="flex-1">
                {deleting ? t("common.deleting") : t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
