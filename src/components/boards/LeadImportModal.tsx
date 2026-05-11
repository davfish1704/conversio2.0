"use client"

import { useState, useCallback, useEffect, useContext, useRef } from "react"
import { X, Upload, FileText } from "lucide-react"
import { LanguageContext } from "@/lib/LanguageContext"

interface LeadImportModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  onSuccess: () => void
}

type ImportTab = "file" | "api"

interface TgInvite {
  deepLink: string
  qrUrl: string
  token: string
  expiresAt: string
}

const inputClass = "mt-1 w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"

export default function LeadImportModal({ isOpen, onClose, boardId, onSuccess }: LeadImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>("file")
  const [file, setFile] = useState<File | null>(null)
  const [manualLead, setManualLead] = useState({ name: "", phone: "", email: "", notes: "", tags: "", channel: "manual" as "whatsapp" | "telegram" | "manual" })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [tgInvite, setTgInvite] = useState<TgInvite | null>(null)
  const [tgInviteLoading, setTgInviteLoading] = useState(false)
  const [tgInviteError, setTgInviteError] = useState<string | null>(null)
  const [tgCopied, setTgCopied] = useState(false)
  const tgAttempted = useRef(false)

  const { t } = useContext(LanguageContext)

  const generateTgInvite = useCallback(async () => {
    setTgInviteLoading(true)
    setTgInvite(null)
    setTgInviteError(null)
    try {
      const chRes = await fetch(`/api/boards/${boardId}/channels`)
      const chData = await chRes.json()
      const tgChannel = (chData.channels || []).find(
        (c: { platform: string; status: string }) => c.platform === "telegram" && c.status === "connected"
      )
      if (!tgChannel) {
        setTgInviteError("Kein Telegram-Bot verbunden. Verbinde zuerst einen Bot unter Einstellungen → Kanäle.")
        return
      }
      const invRes = await fetch(`/api/boards/${boardId}/acquisition-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetChannelId: tgChannel.id }),
      })
      const invData = await invRes.json()
      if (!invRes.ok) { setTgInviteError(invData.error || "Deeplink konnte nicht generiert werden."); return }
      setTgInvite(invData)
    } catch {
      setTgInviteError("Fehler beim Generieren des Links.")
    } finally {
      setTgInviteLoading(false)
    }
  }, [boardId])

  useEffect(() => {
    if (manualLead.channel !== "telegram") { tgAttempted.current = false; return }
    if (!tgAttempted.current) { tgAttempted.current = true; generateTgInvite() }
  }, [manualLead.channel, generateTgInvite])

  const handleChannelChange = (ch: "whatsapp" | "telegram" | "manual") => {
    setManualLead({ ...manualLead, channel: ch })
    if (ch !== "telegram") { setTgInvite(null); setTgInviteError(null) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) { setFile(selected); setUploadResult(null) }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch(`/api/boards/${boardId}/leads/import`, { method: "POST", body: formData })
      const data = await res.json()
      setUploadResult(data)
      if (data.imported > 0) onSuccess()
    } catch {
      setUploadResult({ imported: 0, errors: ["Upload failed"] })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualLead.channel === "telegram" && tgInvite) { onSuccess(); onClose(); return }
    if (manualLead.channel === "whatsapp" && !manualLead.phone) return
    setIsCreating(true)
    try {
      const res = await fetch(`/api/boards/${boardId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualLead.name,
          phone: manualLead.channel !== "manual" ? manualLead.phone : undefined,
          email: manualLead.email,
          notes: manualLead.notes,
          tags: manualLead.tags ? manualLead.tags.split(",").map((t) => t.trim()) : [],
          source: "manual",
          channel: manualLead.channel,
        }),
      })
      if (res.ok) { setManualLead({ name: "", phone: "", email: "", notes: "", tags: "", channel: "manual" }); onSuccess() }
    } finally {
      setIsCreating(false)
    }
  }

  const copyTgLink = () => {
    if (!tgInvite) return
    navigator.clipboard.writeText(tgInvite.deepLink)
    setTgCopied(true)
    setTimeout(() => setTgCopied(false), 2000)
  }

  const downloadTemplate = () => {
    const csv = "name,phone,email,tags\nMax Mustermann,+4915731329868,max@example.com,hot_lead\nAnna Schmidt,+4915123456789,anna@test.de,insurance"
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "lead-template.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const curlExample = `curl -X POST https://conversio-corp-v2.vercel.app/api/boards/${boardId}/leads \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {api_token}" \\
  -d '{
    "name": "Max Mustermann",
    "phone": "+4915731329868",
    "email": "max@example.com",
    "tags": ["hot_lead", "insurance"]
  }'`

  const copyCurl = useCallback(() => { navigator.clipboard.writeText(curlExample) }, [curlExample])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{t("leadImport.importLeads")}</h2>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1 mt-4 bg-muted p-1 rounded-lg">
            {(["file", "api"] as ImportTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "file" ? t("leadImport.fileUpload") : t("leadImport.apiManual")}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "file" ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t("leadImport.acceptedFormats")}</p>
                <button onClick={downloadTemplate} className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  {t("leadImport.downloadTemplate")}
                </button>
              </div>

              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                file ? "border-primary/40 bg-primary/5" : "border-border hover:border-border/60"
              }`}>
                {file ? (
                  <div>
                    <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={() => setFile(null)} className="text-xs text-destructive hover:text-destructive/80 mt-2 transition-colors">
                      {t("leadImport.remove")}
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-9 h-9 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">{t("crm.dropFiles")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("leadImport.csvOrExcel")}</p>
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? t("leadImport.importing") : t("leadImport.importLeadsBtn")}
              </button>

              {uploadResult && (
                <div className={`p-4 rounded-lg text-sm ${uploadResult.imported > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  <p className="font-medium">
                    {uploadResult.imported} {t("leadImport.leadsImported")}
                    {uploadResult.errors.length > 0 && `, ${uploadResult.errors.length} ${t("leadImport.errors")}`}
                  </p>
                  {uploadResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs opacity-80">
                      {uploadResult.errors.slice(0, 5).map((err, i) => <li key={i}>&bull; {err}</li>)}
                      {uploadResult.errors.length > 5 && <li>... {t("leadImport.andMore").replace("{count}", String(uploadResult.errors.length - 5))}</li>}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleCreateManual} className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">{t("leadImport.addManually")}</h3>

                {/* Channel Picker */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Kanal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["whatsapp", "telegram", "manual"] as const).map((ch) => {
                      const labels: Record<string, string> = { whatsapp: "WhatsApp", telegram: "Telegram", manual: "Manuell" }
                      const icons: Record<string, string> = { whatsapp: "💬", telegram: "✈️", manual: "📝" }
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => handleChannelChange(ch)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                            manualLead.channel === ch
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span>{icons[ch]}</span>
                          <span>{labels[ch]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Telegram invite */}
                {manualLead.channel === "telegram" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">✈️</span>
                        <p className="text-sm font-medium text-primary">Telegram-Einladungslink</p>
                      </div>

                      {tgInviteLoading && (
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Generiere Link…
                        </div>
                      )}

                      {tgInviteError && (
                        <div className="space-y-2">
                          <p className="text-xs text-destructive">{tgInviteError}</p>
                          <button type="button" onClick={() => { tgAttempted.current = false; generateTgInvite() }}
                            className="text-xs text-primary underline">
                            Erneut versuchen
                          </button>
                        </div>
                      )}

                      {tgInvite && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-background border border-border px-2 py-1.5 rounded-lg truncate text-foreground">
                              {tgInvite.deepLink}
                            </code>
                            <button type="button" onClick={copyTgLink}
                              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                              {tgCopied ? "✓ Kopiert" : "Kopieren"}
                            </button>
                          </div>
                          <div className="flex items-start gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={tgInvite.qrUrl} alt="QR-Code" width={80} height={80}
                              className="rounded-lg border border-border bg-white" />
                            <div className="space-y-1">
                              <p className="text-xs text-primary/80">
                                Sende den Link oder QR-Code an den Lead. Sobald er dem Bot schreibt, erscheint er in der Pipeline.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Gültig bis {new Date(tgInvite.expiresAt).toLocaleDateString("de-DE")}
                              </p>
                              <a href={tgInvite.qrUrl} download="telegram-invite-qr.png"
                                className="inline-block text-xs text-primary underline">
                                QR herunterladen
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Optional: Lead-Datensatz jetzt anlegen (z.B. für Notizen).</p>
                    <div>
                      <label className="block text-xs font-medium text-foreground">{t("common.phone")} (optional)</label>
                      <input type="tel" value={manualLead.phone} onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                        className={inputClass} placeholder="+4915731329868 (für interne Notiz)" />
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-foreground">
                    {t("common.name")}{manualLead.channel !== "telegram" && " *"}{manualLead.channel === "telegram" && " (optional)"}
                  </label>
                  <input type="text" value={manualLead.name} onChange={(e) => setManualLead({ ...manualLead, name: e.target.value })}
                    className={inputClass} placeholder="Max Mustermann" required={manualLead.channel !== "telegram"} />
                </div>

                {manualLead.channel === "whatsapp" && (
                  <div>
                    <label className="block text-xs font-medium text-foreground">{t("leadImport.phoneRequired")}</label>
                    <input type="tel" value={manualLead.phone} onChange={(e) => setManualLead({ ...manualLead, phone: e.target.value })}
                      className={inputClass} placeholder="+4915731329868" required />
                  </div>
                )}

                {manualLead.channel === "manual" && (
                  <div>
                    <label className="block text-xs font-medium text-foreground">Notizen (optional)</label>
                    <textarea value={manualLead.notes} onChange={(e) => setManualLead({ ...manualLead, notes: e.target.value })}
                      className={inputClass + " resize-none"} placeholder="Intern: Interessent aus Messe..." rows={2} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground">{t("common.email")}</label>
                    <input type="email" value={manualLead.email} onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                      className={inputClass} placeholder="max@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground">{t("common.tags")}</label>
                    <input type="text" value={manualLead.tags} onChange={(e) => setManualLead({ ...manualLead, tags: e.target.value })}
                      className={inputClass} placeholder="hot_lead, insurance" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    isCreating ||
                    (manualLead.channel === "whatsapp" && !manualLead.phone) ||
                    (manualLead.channel !== "telegram" && !manualLead.name.trim()) ||
                    (manualLead.channel === "telegram" && !tgInvite && !manualLead.name.trim())
                  }
                  className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? t("leadImport.saving") : manualLead.channel === "telegram" && tgInvite ? "Fertig" : t("leadImport.saveLead")}
                </button>
              </form>

              {/* API Section */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground mb-2">{t("leadImport.apiIntegration")}</h3>
                <p className="text-xs text-muted-foreground mb-3">{t("leadImport.replaceToken")}</p>
                <div className="relative bg-gray-950 rounded-lg p-4">
                  <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">{curlExample}</pre>
                  <button onClick={copyCurl}
                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-gray-800 rounded transition-colors"
                    title={t("leadImport.copy")}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
