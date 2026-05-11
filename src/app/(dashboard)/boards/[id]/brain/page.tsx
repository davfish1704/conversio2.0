"use client"

import { useEffect, useState, useCallback, useContext } from "react"
import { useParams } from "next/navigation"
import BoardNav from "@/components/boards/BoardNav"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface BrainData {
  systemPrompt: string | null
  stylePrompt: string | null
  infoPrompt: string | null
  rulePrompt: string | null
  channelSwitchTemplate: string | null
}

interface BrainDocument {
  id: string
  name: string
  content: string
  createdAt: string
}

interface BrainRule {
  id: string
  name: string
  rule: string
  severity: string
  createdAt: string
}

interface BrainFAQ {
  id: string
  question: string
  answer: string
  createdAt: string
}

const taClass = "w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm resize-none"
const inputClass = "w-full px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"

export default function BrainLabPage() {
  const { id } = useParams() as { id: string }
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"prompts" | "documents" | "rules" | "faqs">("prompts")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [brainData, setBrainData] = useState<BrainData>({
    systemPrompt: "",
    stylePrompt: "",
    infoPrompt: "",
    rulePrompt: "",
    channelSwitchTemplate: "",
  })

  const [documents, setDocuments] = useState<BrainDocument[]>([])
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocContent, setNewDocContent] = useState("")

  const [rules, setRules] = useState<BrainRule[]>([])
  const [newRuleTitle, setNewRuleTitle] = useState("")
  const [newRuleContent, setNewRuleContent] = useState("")
  const [newRuleSeverity, setNewRuleSeverity] = useState("warning")

  const [faqs, setFaqs] = useState<BrainFAQ[]>([])
  const [newFAQQuestion, setNewFAQQuestion] = useState("")
  const [newFAQAnswer, setNewFAQAnswer] = useState("")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [brainRes, docsRes, rulesRes, faqsRes] = await Promise.all([
        fetch(`/api/boards/${id}/brain`),
        fetch(`/api/boards/${id}/brain/documents`),
        fetch(`/api/boards/${id}/brain/rules`),
        fetch(`/api/boards/${id}/brain/faqs`),
      ])
      if (brainRes.ok) { const d = await brainRes.json(); setBrainData(d.brain || d) }
      if (docsRes.ok) { const d = await docsRes.json(); setDocuments(d.documents || []) }
      if (rulesRes.ok) { const d = await rulesRes.json(); setRules(d.rules || []) }
      if (faqsRes.ok) { const d = await faqsRes.json(); setFaqs(d.faqs || []) }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  const savePrompts = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${id}/brain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brainData),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Prompts gespeichert" })
    } catch {
      toast({ title: "Fehler beim Speichern", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const addDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDocTitle, content: newDocContent }),
      })
      if (!res.ok) throw new Error("Add failed")
      setNewDocTitle(""); setNewDocContent("")
      fetchAll()
    } catch {
      toast({ title: "Fehler beim Hinzufügen", variant: "destructive" })
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!confirm("Dokument wirklich löschen?")) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId }),
      })
      if (!res.ok) throw new Error("Delete failed")
      fetchAll()
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" })
    }
  }

  const addRule = async () => {
    if (!newRuleTitle.trim() || !newRuleContent.trim()) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRuleTitle, rule: newRuleContent, severity: newRuleSeverity }),
      })
      if (!res.ok) throw new Error("Add failed")
      setNewRuleTitle(""); setNewRuleContent(""); setNewRuleSeverity("warning")
      fetchAll()
    } catch {
      toast({ title: "Fehler beim Hinzufügen", variant: "destructive" })
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Regel wirklich löschen?")) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/rules`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId }),
      })
      if (!res.ok) throw new Error("Delete failed")
      fetchAll()
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" })
    }
  }

  const addFAQ = async () => {
    if (!newFAQQuestion.trim() || !newFAQAnswer.trim()) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newFAQQuestion, answer: newFAQAnswer }),
      })
      if (!res.ok) throw new Error("Add failed")
      setNewFAQQuestion(""); setNewFAQAnswer("")
      fetchAll()
    } catch {
      toast({ title: "Fehler beim Hinzufügen", variant: "destructive" })
    }
  }

  const deleteFAQ = async (faqId: string) => {
    if (!confirm("FAQ wirklich löschen?")) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/faqs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: faqId }),
      })
      if (!res.ok) throw new Error("Delete failed")
      fetchAll()
    } catch {
      toast({ title: "Fehler beim Löschen", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const TABS = [
    { key: "prompts" as const, label: "System Prompts" },
    { key: "documents" as const, label: `Dokumente (${documents.length})` },
    { key: "rules" as const, label: `Regeln (${rules.length})` },
    { key: "faqs" as const, label: `FAQs (${faqs.length})` },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-xl font-semibold text-foreground">BrainLab</h1>
            <p className="text-xs text-muted-foreground mt-0.5">KI-Persönlichkeit & Wissensdatenbank</p>
          </div>
          <BoardNav />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab navigation */}
        <div className="flex gap-0 border-b border-border mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PROMPTS ── */}
        {activeTab === "prompts" && (
          <div className="space-y-4 max-w-3xl">
            {[
              { key: "systemPrompt" as keyof BrainData, title: "System Prompt", desc: "Definiert die Kernpersönlichkeit und Rolle der KI", rows: 6, placeholder: "Du bist ein freundlicher und kompetenter Versicherungsmakler…" },
              { key: "stylePrompt" as keyof BrainData, title: "Style Prompt", desc: "Definiert Ton, Länge und Kommunikationsstil", rows: 4, placeholder: "Antworte immer kurz und prägnant (max. 2 Sätze)…" },
              { key: "infoPrompt" as keyof BrainData, title: "Info Prompt", desc: "Produktwissen und Fachinformationen", rows: 4, placeholder: "Produkt A kostet 50 €/Monat, deckt bis zu 100.000 € ab…" },
              { key: "rulePrompt" as keyof BrainData, title: "Rule Prompt", desc: "Harte Grenzen und Guardrails", rows: 4, placeholder: "- Keine Garantien geben\n- Keine medizinischen Ratschläge…" },
            ].map(({ key, title, desc, rows, placeholder }) => (
              <div key={key} className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{desc}</p>
                <textarea
                  value={brainData[key] || ""}
                  onChange={(e) => setBrainData({ ...brainData, [key]: e.target.value })}
                  rows={rows}
                  className={taClass}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1">Channel-Switch Template</h3>
              <p className="text-xs text-muted-foreground mb-1">
                Vorlage für die Nachricht, die beim Channel-Wechsel gesendet wird.
              </p>
              <p className="text-xs text-primary mb-3">
                Variablen:{" "}
                <code className="bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{"{channel}"}</code>{" "}
                <code className="bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">{"{link}"}</code>
              </p>
              <textarea
                value={brainData.channelSwitchTemplate || ""}
                onChange={(e) => setBrainData({ ...brainData, channelSwitchTemplate: e.target.value })}
                rows={3}
                className={taClass}
                placeholder="Du kannst diese Unterhaltung auch auf {channel} weiterführen: {link}"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={savePrompts} disabled={saving}>
                {saving ? "Speichern…" : "Alle Prompts speichern"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  fetch(`/api/boards/${id}/brain/simulate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: "Hallo" }),
                  })
                    .then(r => r.json())
                    .then(data => toast({ title: "Simulation erfolgreich", description: data?.message || "KI-Antwort erhalten" }))
                    .catch(() => toast({ title: "Simulation fehlgeschlagen", variant: "destructive" }))
                }}
              >
                Test-Simulation
              </Button>
            </div>
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Dokument hinzufügen</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Titel</label>
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className={inputClass}
                    placeholder="z.B. Produktkatalog 2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Inhalt</label>
                  <textarea
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    rows={6}
                    className={taClass}
                    placeholder="Dokumentinhalt hier einfügen…"
                  />
                </div>
                <Button size="sm" onClick={addDocument}>+ Dokument hinzufügen</Button>
              </div>
            </div>

            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground">Noch keine Dokumente. Füge dein erstes Wissensdokument hinzu.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">{doc.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(doc.createdAt).toLocaleDateString("de-DE")}</p>
                        <p className="text-xs text-muted-foreground mt-3 whitespace-pre-wrap">{doc.content}</p>
                      </div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="ml-4 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── RULES ── */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Regel hinzufügen</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Titel</label>
                  <input
                    type="text"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className={inputClass}
                    placeholder="z.B. Keine Medizinischen Ratschläge"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Inhalt</label>
                  <textarea
                    value={newRuleContent}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    rows={4}
                    className={taClass}
                    placeholder="Gib niemals medizinische Ratschläge. Verweise immer auf einen zugelassenen Arzt…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Schwere</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value)}
                    className="w-36 px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="warning">Warnung</option>
                    <option value="error">Fehler</option>
                  </select>
                </div>
                <Button size="sm" onClick={addRule}>+ Regel hinzufügen</Button>
              </div>
            </div>

            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground">Noch keine Regeln. Füge deine erste Guardrail-Regel hinzu.</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div key={rule.id} className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-sm font-semibold text-foreground">{rule.name}</h4>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] rounded-md font-medium",
                            rule.severity === "error"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/15 text-warning"
                          )}>
                            {rule.severity === "error" ? "Fehler" : "Warnung"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(rule.createdAt).toLocaleDateString("de-DE")}</p>
                        <p className="text-xs text-muted-foreground mt-3">{rule.rule}</p>
                      </div>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="ml-4 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── FAQs ── */}
        {activeTab === "faqs" && (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">FAQ hinzufügen</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Frage</label>
                  <input
                    type="text"
                    value={newFAQQuestion}
                    onChange={(e) => setNewFAQQuestion(e.target.value)}
                    className={inputClass}
                    placeholder="z.B. Was sind Ihre Öffnungszeiten?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Antwort</label>
                  <textarea
                    value={newFAQAnswer}
                    onChange={(e) => setNewFAQAnswer(e.target.value)}
                    rows={4}
                    className={taClass}
                    placeholder="Wir sind Montag bis Freitag, 9–18 Uhr erreichbar…"
                  />
                </div>
                <Button size="sm" onClick={addFAQ}>+ FAQ hinzufügen</Button>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground">Noch keine FAQs. Füge deine erste häufig gestellte Frage hinzu.</p>
                </div>
              ) : (
                faqs.map((faq) => (
                  <div key={faq.id} className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground">F: {faq.question}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(faq.createdAt).toLocaleDateString("de-DE")}</p>
                        <p className="text-xs text-muted-foreground mt-3">A: {faq.answer}</p>
                      </div>
                      <button
                        onClick={() => deleteFAQ(faq.id)}
                        className="ml-4 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
