"use client"

import { useEffect, useState, useCallback, useContext } from "react"
import { useParams } from "next/navigation"
import BoardNav from "@/components/boards/BoardNav"
import { LanguageContext } from "@/lib/LanguageContext"
import { useToast } from "@/hooks/use-toast"

// ============================================
// TYPES
// ============================================
interface BrainData {
  systemPrompt: string | null
  stylePrompt: string | null
  infoPrompt: string | null
  rulePrompt: string | null
  channelSwitchTemplate: string | null
}

interface BrainDocument {
  id: string
  title: string
  content: string
  createdAt: string
}

interface BrainRule {
  id: string
  title: string
  content: string
  priority: number
  createdAt: string
}

interface BrainFAQ {
  id: string
  question: string
  answer: string
  createdAt: string
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function BrainLabPage() {
  const { id } = useParams() as { id: string }
  const { t } = useContext(LanguageContext)
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"prompts" | "documents" | "rules" | "faqs">("prompts")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Prompts State
  const [brainData, setBrainData] = useState<BrainData>({
    systemPrompt: "",
    stylePrompt: "",
    infoPrompt: "",
    rulePrompt: "",
    channelSwitchTemplate: "",
  })

  // Documents State
  const [documents, setDocuments] = useState<BrainDocument[]>([])
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocContent, setNewDocContent] = useState("")

  // Rules State
  const [rules, setRules] = useState<BrainRule[]>([])
  const [newRuleTitle, setNewRuleTitle] = useState("")
  const [newRuleContent, setNewRuleContent] = useState("")
  const [newRulePriority, setNewRulePriority] = useState(1)

  // FAQs State
  const [faqs, setFaqs] = useState<BrainFAQ[]>([])
  const [newFAQQuestion, setNewFAQQuestion] = useState("")
  const [newFAQAnswer, setNewFAQAnswer] = useState("")

  // ============================================
  // FETCH ALL DATA
  // ============================================
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [brainRes, docsRes, rulesRes, faqsRes] = await Promise.all([
        fetch(`/api/boards/${id}/brain`),
        fetch(`/api/boards/${id}/brain/documents`),
        fetch(`/api/boards/${id}/brain/rules`),
        fetch(`/api/boards/${id}/brain/faqs`),
      ])

      if (brainRes.ok) {
        const data = await brainRes.json()
        setBrainData(data.brain || data)
      }
      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocuments(data.documents || [])
      }
      if (rulesRes.ok) {
        const data = await rulesRes.json()
        setRules(data.rules || [])
      }
      if (faqsRes.ok) {
        const data = await faqsRes.json()
        setFaqs(data.faqs || [])
      }
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ============================================
  // SAVE PROMPTS
  // ============================================
  const savePrompts = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${id}/brain`, {
        method: "PATCH",
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

  // ============================================
  // DOCUMENT CRUD
  // ============================================
  const addDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDocTitle, content: newDocContent }),
      })
      if (!res.ok) throw new Error("Add failed")
      setNewDocTitle("")
      setNewDocContent("")
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

  // ============================================
  // RULE CRUD
  // ============================================
  const addRule = async () => {
    if (!newRuleTitle.trim() || !newRuleContent.trim()) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newRuleTitle, content: newRuleContent, priority: newRulePriority }),
      })
      if (!res.ok) throw new Error("Add failed")
      setNewRuleTitle("")
      setNewRuleContent("")
      setNewRulePriority(1)
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

  // ============================================
  // FAQ CRUD
  // ============================================
  const addFAQ = async () => {
    if (!newFAQQuestion.trim() || !newFAQAnswer.trim()) return
    try {
      const res = await fetch(`/api/boards/${id}/brain/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newFAQQuestion, answer: newFAQAnswer }),
      })
      if (!res.ok) throw new Error("Add failed")
      setNewFAQQuestion("")
      setNewFAQAnswer("")
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

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BrainLab</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI Personality & Knowledge Base</p>
          </div>
          <BoardNav />
        </div>
      </div>

      {/* BrainLab Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
          {[
            { key: "prompts" as const, label: "System Prompts" },
            { key: "documents" as const, label: `Documents (${documents.length})` },
            { key: "rules" as const, label: `Rules (${rules.length})` },
            { key: "faqs" as const, label: `FAQs (${faqs.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================
            TAB 1: SYSTEM PROMPTS
        ============================================ */}
        {activeTab === "prompts" && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Prompt</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Defines the AI&apos;s core personality and role</p>
              <textarea
                value={brainData.systemPrompt || ""}
                onChange={(e) => setBrainData({ ...brainData, systemPrompt: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="You are a friendly and competent insurance broker..."
              />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Style Prompt</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Defines tone, length, and communication style</p>
              <textarea
                value={brainData.stylePrompt || ""}
                onChange={(e) => setBrainData({ ...brainData, stylePrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Always answer short and concise (max. 2 sentences)..."
              />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Info Prompt</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Product knowledge and factual information</p>
              <textarea
                value={brainData.infoPrompt || ""}
                onChange={(e) => setBrainData({ ...brainData, infoPrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Product A costs €50/month, covers up to €100,000..."
              />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rule Prompt</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Hard constraints and guardrails</p>
              <textarea
                value={brainData.rulePrompt || ""}
                onChange={(e) => setBrainData({ ...brainData, rulePrompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="- Never give guarantees&#10;- No medical advice&#10;- Always refer to a human agent when..."
              />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Channel-Switch Template</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Vorlage für die Nachricht, die beim Channel-Wechsel gesendet wird.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                Verfügbare Variablen: <code className="bg-blue-50 dark:bg-blue-900/30 px-1 rounded">{"{channel}"}</code>{" "}
                <code className="bg-blue-50 dark:bg-blue-900/30 px-1 rounded">{"{link}"}</code>
              </p>
              <textarea
                value={brainData.channelSwitchTemplate || ""}
                onChange={(e) => setBrainData({ ...brainData, channelSwitchTemplate: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Du kannst diese Unterhaltung auch auf {channel} weiterführen: {link}"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={savePrompts}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? "Speichern..." : "Alle Prompts speichern"}
              </button>
              <button
                onClick={() => {
                  fetch(`/api/boards/${id}/brain/simulate`, { method: "POST" })
                    .then(r => r.json())
                    .then(data => toast({ title: "Simulation erfolgreich", description: data?.message || "KI-Antwort erhalten" }))
                    .catch(() => toast({ title: "Simulation fehlgeschlagen", variant: "destructive" }))
                }}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium"
              >
                Test-Simulation
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            TAB 2: DOCUMENTS
        ============================================ */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            {/* Add New Document */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Document</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Product Catalog 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                  <textarea
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Paste document content here..."
                  />
                </div>
                <button
                  onClick={addDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  + Add Document
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">No documents yet. Add your first knowledge document above.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{doc.title}</h4>
                        <p className="text-xs text-gray-400 mt-1">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-wrap">{doc.content}</p>
                      </div>
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================
            TAB 3: RULES
        ============================================ */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            {/* Add New Rule */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Rule</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. No Medical Advice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                  <textarea
                    value={newRuleContent}
                    onChange={(e) => setNewRuleContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Never provide medical advice. Always refer to a licensed physician..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newRulePriority}
                    onChange={(e) => setNewRulePriority(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  + Add Rule
                </button>
              </div>
            </div>

            {/* Rules List */}
            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">No rules yet. Add your first guardrail rule above.</p>
                </div>
              ) : (
                rules
                  .sort((a, b) => b.priority - a.priority)
                  .map((rule) => (
                    <div key={rule.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{rule.title}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              rule.priority >= 8 ? "bg-red-100 text-red-700" :
                              rule.priority >= 5 ? "bg-yellow-100 text-yellow-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              P{rule.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{new Date(rule.createdAt).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{rule.content}</p>
                        </div>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* ============================================
            TAB 4: FAQS
        ============================================ */}
        {activeTab === "faqs" && (
          <div className="space-y-6">
            {/* Add New FAQ */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add FAQ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                  <input
                    type="text"
                    value={newFAQQuestion}
                    onChange={(e) => setNewFAQQuestion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. What are your opening hours?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer</label>
                  <textarea
                    value={newFAQAnswer}
                    onChange={(e) => setNewFAQAnswer(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="We are open Monday to Friday, 9 AM to 6 PM..."
                  />
                </div>
                <button
                  onClick={addFAQ}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  + Add FAQ
                </button>
              </div>
            </div>

            {/* FAQs List */}
            <div className="space-y-3">
              {faqs.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">No FAQs yet. Add your first frequently asked question above.</p>
                </div>
              ) : (
                faqs.map((faq) => (
                  <div key={faq.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">Q: {faq.question}</h4>
                        <p className="text-xs text-gray-400 mt-1">{new Date(faq.createdAt).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">A: {faq.answer}</p>
                      </div>
                      <button
                        onClick={() => deleteFAQ(faq.id)}
                        className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        Delete
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
