"use client"

import { useState, useEffect, useCallback, useRef, useContext } from "react"
import { type Lead } from "./LeadCard"
import { getInitials, getAvatarColor, formatRelativeTime } from "@/lib/utils/formatting"
import { LanguageContext } from "@/lib/LanguageContext"

interface Message {
  id: string
  direction: "INBOUND" | "OUTBOUND"
  content: string
  timestamp: string
  aiGenerated?: boolean
  status: string
}

interface FieldDefinition {
  id: string
  name: string
  type: string
  required?: boolean
  options?: string[]
}

interface LeadDrawerProps {
  lead: Lead | null
  states: { id: string; name: string }[]
  boardId: string
  onClose: () => void
  onUpdate: () => void
}

const ChannelIcon = ({ channel }: { channel: string }) => {
  switch (channel) {
    case "whatsapp": return <span className="text-green-600 text-xs font-medium">📱 WA</span>
    case "instagram": return <span className="text-pink-500 text-xs font-medium">📸 IG</span>
    case "facebook": return <span className="text-blue-600 text-xs font-medium">👍 FB</span>
    default: return <span className="text-gray-500 text-xs">💬</span>
  }
}

export default function LeadDrawer({ lead, states, boardId, onClose, onUpdate }: LeadDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [aiSuggestion, setAiSuggestion] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFrozen, setIsFrozen] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([])
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t, language } = useContext(LanguageContext)

  useEffect(() => {
    if (lead) {
      setIsFrozen(lead.frozen || false)
      setAiEnabled(lead.aiEnabled !== false)
      loadMessages()
      loadFieldDefinitions()
    }
  }, [lead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = useCallback(async () => {
    if (!lead) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/conversations/${lead.id}/messages`)
      if (!res.ok) throw new Error("Failed to load messages")
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (err) {
      console.error("Load messages error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [lead])

  const loadFieldDefinitions = useCallback(async () => {
    if (!boardId || !lead) return
    try {
      const res = await fetch(`/api/boards/${boardId}/fields`)
      if (!res.ok) throw new Error("Failed to fetch fields")
      const data = await res.json()
      setFieldDefinitions(data.fields || [])
      setCustomFields((lead.customFields as Record<string, unknown>) || {})
    } catch (err) {
      console.error("Field definitions fetch error:", err)
    }
  }, [boardId, lead])

  const sendMessage = async (content: string, aiGenerated = false) => {
    if (!lead || !content.trim()) return

    try {
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        direction: "OUTBOUND",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        aiGenerated,
        status: "SENDING",
      }
      setMessages((prev) => [...prev, tempMessage])

      const res = await fetch(`/api/conversations/${lead.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          direction: "OUTBOUND",
          aiGenerated,
        }),
      })

      if (!res.ok) throw new Error("Failed to send message")
      const data = await res.json()
      
      setMessages((prev) => 
        prev.map((m) => m.id === tempMessage.id ? data.message : m)
      )

      setNewMessage("")
      setAiSuggestion("")
      onUpdate()
    } catch (err) {
      console.error("Send message error:", err)
      setMessages((prev) =>
        prev.map((m) => m.status === "SENDING" ? { ...m, status: "FAILED" } : m)
      )
    }
  }

  const generateAiSuggestion = async () => {
    if (!lead || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "custom",
          data: {
            messages: [
              {
                role: "system",
                content: "Du bist ein freundlicher Versicherungsmakler. Schreibe kurze, professionelle WhatsApp-Nachrichten auf Deutsch. Maximal 2 Sätze.",
              },
              {
                role: "user",
                content: `Erstelle eine passende Antwort für ${lead.customerName || "den Kunden"}. Letzte Nachricht: ${messages[messages.length - 1]?.content || "Neuer Kontakt"}`,
              },
            ],
          },
        }),
      })

      if (!res.ok) throw new Error("AI generation failed")
      const data = await res.json()
      setAiSuggestion(data.data?.content || "")
    } catch (err) {
      console.error("AI suggestion error:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleFreeze = async () => {
    if (!lead) return
    try {
      const res = await fetch(`/api/conversations/${lead.id}/freeze`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frozen: !isFrozen, reason: "Manual freeze" }),
      })

      if (!res.ok) throw new Error("Freeze toggle failed")
      const data = await res.json()
      setIsFrozen(data.conversation.frozen)
      onUpdate()
    } catch (err) {
      console.error("Freeze error:", err)
    }
  }

  const toggleAi = async () => {
    setAiEnabled(!aiEnabled)
  }

  if (!lead) return null

  const locale = language === "de" ? "de-DE" : "en-US"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(lead.id)}`}>
              {getInitials(lead.customerName || lead.customerPhone)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {lead.customerName || lead.customerPhone}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ChannelIcon channel={lead.channel || "whatsapp"} />
                <span>{lead.customerPhone}</span>
                <span>·</span>
                <span>{formatRelativeTime(lead.lastMessageAt, language)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAi}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                aiEnabled
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {aiEnabled ? "✨ KI an" : "KI aus"}
            </button>

            <button
              onClick={toggleFreeze}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isFrozen
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {isFrozen ? "❄️ Frozen" : "Freeze"}
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content: Chat + Data Side by Side */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left: Chat */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100 dark:border-gray-800">
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-sm">Noch keine Nachrichten</p>
                  <p className="text-xs mt-1">Starte die Konversation oder generiere eine KI-Begrüßung</p>
                  {aiEnabled && !isFrozen && (
                    <button
                      onClick={generateAiSuggestion}
                      className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                    >
                      ✨ KI-Begrüßung generieren
                    </button>
                  )}
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] ${msg.direction === "OUTBOUND" ? "items-end" : "items-start"}`}>
                      {/* Sender Label */}
                      <div className={`text-xs text-gray-400 mb-1 px-1 ${
                        msg.direction === "OUTBOUND" ? "text-right" : "text-left"
                      }`}>
                        {msg.direction === "OUTBOUND" ? (
                          msg.aiGenerated ? <span className="text-purple-500">✨ KI</span> : "Du"
                        ) : (
                          lead.customerName || "Kunde"
                        )}
                      </div>
                      
                      {/* Bubble */}
                      <div className={`px-4 py-3 rounded-2xl text-sm ${
                        msg.direction === "OUTBOUND"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm"
                      }`}>
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                      
                      {/* Meta */}
                      <div className={`flex items-center gap-1.5 mt-1 px-1 text-xs text-gray-400 ${
                        msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                      }`}>
                        <span>{new Date(msg.timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
                        {msg.status === "SENDING" && <span className="text-yellow-500">⏳</span>}
                        {msg.status === "FAILED" && <span className="text-red-500">❌</span>}
                        {msg.status === "SENT" && msg.direction === "OUTBOUND" && <span className="text-blue-300">✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestion */}
            {aiSuggestion && !isFrozen && aiEnabled && (
              <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                <div className="flex items-start gap-3">
                  <span className="text-purple-500 text-lg">✨</span>
                  <div className="flex-1">
                    <p className="text-sm text-purple-900 leading-relaxed">{aiSuggestion}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => sendMessage(aiSuggestion, true)}
                        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Übernehmen & Senden
                      </button>
                      <button
                        onClick={() => setAiSuggestion("")}
                        className="px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Ignorieren
                      </button>
                      <button
                        onClick={generateAiSuggestion}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-white text-purple-600 text-sm rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? "..." : "Neu generieren"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            {!isFrozen ? (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(newMessage)}
                    placeholder="Nachricht schreiben..."
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => sendMessage(newMessage)}
                    disabled={!newMessage.trim()}
                    className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Senden
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  {aiEnabled && (
                    <button
                      onClick={generateAiSuggestion}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <span>✨</span>
                      {isGenerating ? "Generiere..." : "KI-Vorschlag"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-100 bg-blue-50 shrink-0">
                <p className="text-sm text-blue-700 text-center font-medium">
                  ❄️ Dieser Chat ist eingefroren. Manuelle Übernahme aktiv.
                </p>
              </div>
            )}
          </div>

          {/* Right: Data Panel */}
          <div className="w-80 bg-gray-50 dark:bg-gray-900 overflow-y-auto shrink-0">
            <div className="p-5 space-y-5">
              
              {/* Contact */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Kontakt
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs text-gray-400">Telefon</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.customerName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Quelle</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{lead.source || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kanal</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ChannelIcon channel={lead.channel || "whatsapp"} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Status
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs text-gray-400">Aktueller State</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {states.find((s) => s.id === lead.currentStateId)?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Lead Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min((lead.leadScore || 0) * 10, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{lead.leadScore || 0}/10</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Erstellt</p>
                    <p className="text-sm text-gray-700">
                      {new Date(lead.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {lead.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Notizen
                </h4>
                <textarea
                  defaultValue={String(lead.notes || "")}
                  placeholder="Notizen hinzufügen..."
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
                  rows={4}
                />
              </div>

              {/* Custom Fields */}
              {fieldDefinitions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Zusätzliche Felder
                  </h4>
                  <div className="space-y-3">
                    {fieldDefinitions.map((field) => (
                      <div key={field.id}>
                        <label className="block text-xs text-gray-400 mb-1">
                          {field.name}
                          {field.required && <span className="text-red-400 ml-0.5">*</span>}
                        </label>
                        <input
                          type="text"
                          defaultValue={String(customFields[field.id] || "")}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* State History Toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full text-left text-xs text-blue-600 hover:text-blue-700 font-medium py-2"
              >
                {showHistory ? "▼" : "▶"} State-Verlauf anzeigen
              </button>

              {showHistory && (
                <div className="space-y-2 text-xs">
                  {((lead.stateHistory as any[]) || []).map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-gray-600">
                      <span className="text-gray-400 mt-0.5">→</span>
                      <div>
                        <span className="font-medium">{entry.fromStateName || "Start"}</span>
                        {" → "}
                        <span className="font-medium">
                          {states.find((s) => s.id === entry.toStateId)?.name || "?"}
                        </span>
                        <p className="text-gray-400 mt-0.5">
                          {new Date(entry.timestamp).toLocaleString(locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
