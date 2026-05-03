"use client"

import { useState, useEffect, useCallback, useRef, useContext } from "react"
import { type Lead } from "./LeadCard"
import { getInitials, getAvatarColor, formatRelativeTime } from "@/lib/utils/formatting"
import { LanguageContext } from "@/lib/LanguageContext"
import TelegramInviteUI from "@/components/leads/TelegramInviteUI"
import ChannelInviteUI from "@/components/leads/ChannelInviteUI"

interface ConversationItem {
  id: string
  channel: string
  externalId: string | null
  status: string
  lastMessageAt: string
}

interface BoardChannelOption {
  id: string
  platform: string
  status: string
}

interface PendingInvite {
  id: string
  token: string
  targetChannelId: string
  expiresAt: string
}

interface InviteData {
  token: string
  deepLink: string
  qrUrl: string
  expiresAt: string
}

interface Message {
  id: string
  direction: "INBOUND" | "OUTBOUND"
  content: string
  timestamp: string
  aiGenerated?: boolean
  status: string
}

interface FieldDefinition {
  id?: string
  key: string
  label: string
  name?: string  // legacy alias
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

const ChannelIcon = ({ channel, size = "sm" }: { channel: string; size?: "sm" | "md" }) => {
  const s = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5"
  switch (channel) {
    case "whatsapp":
      return (
        <span className="inline-flex items-center gap-1 text-green-600">
          <svg className={s} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          <span className="text-xs font-medium">WA</span>
        </span>
      )
    case "telegram":
      return (
        <span className="inline-flex items-center gap-1 text-[#2AABEE]">
          <svg className={s} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
          </svg>
          <span className="text-xs font-medium">TG</span>
        </span>
      )
    case "instagram":
      return (
        <span className="inline-flex items-center gap-1 text-pink-500">
          <svg className={s} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span className="text-xs font-medium">IG</span>
        </span>
      )
    case "manual":
      return (
        <span className="inline-flex items-center gap-1 text-gray-500">
          <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium">Manuell</span>
        </span>
      )
    default:
      return <span className="text-gray-400 text-xs">—</span>
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
  const [notesValue, setNotesValue] = useState("")
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [boardChannels, setBoardChannels] = useState<BoardChannelOption[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [showChannelDropdown, setShowChannelDropdown] = useState(false)
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t, language } = useContext(LanguageContext)

  useEffect(() => {
    if (lead) {
      setIsFrozen(lead.frozen || false)
      setAiEnabled((lead as any).aiEnabled !== false)
      setNotesValue(String((lead.customData as any)?.notes ?? lead.notes ?? ""))
      setInviteData(null)
      setChannelModalOpen(false)
      setSelectedChannelId(null)
      loadMessages()
      loadFieldDefinitions()
      loadConversations()
      loadBoardChannels()
      loadPendingInvites()
    }
  }, [lead])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = useCallback(async () => {
    if (!lead) return
    setIsLoading(true)
    try {
      // Nutze conversationId wenn vorhanden (Lead-basierte API), sonst lead.id als Fallback
      const convId = (lead as any).conversationId || lead.id
      const res = await fetch(`/api/conversations/${convId}/messages`)
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
      const res = await fetch(`/api/boards/${boardId}/custom-fields`)
      if (!res.ok) throw new Error("Failed to fetch fields")
      const data = await res.json()
      setFieldDefinitions(data.fields || [])
      const leadAny = lead as unknown as Record<string, unknown>
      setCustomFields(
        (leadAny.customData as Record<string, unknown>) || {}
      )
    } catch (err) {
      console.error("Field definitions fetch error:", err)
    }
  }, [boardId, lead])

  const loadConversations = useCallback(async () => {
    if (!lead) return
    try {
      const res = await fetch(`/api/leads/${lead.id}/conversations`)
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch { /* silent */ }
  }, [lead])

  const loadBoardChannels = useCallback(async () => {
    if (!boardId) return
    try {
      const res = await fetch(`/api/boards/${boardId}/channels`)
      if (!res.ok) return
      const data = await res.json()
      setBoardChannels((data.channels || []).filter((c: BoardChannelOption) => c.status === "connected"))
    } catch { /* silent */ }
  }, [boardId])

  const loadPendingInvites = useCallback(async () => {
    if (!lead) return
    try {
      const res = await fetch(`/api/leads/${lead.id}/invites`)
      if (!res.ok) return
      const data = await res.json()
      setPendingInvites(data.invites || [])
    } catch { /* silent */ }
  }, [lead])

  const handleAddChannel = (channelId: string) => {
    setSelectedChannelId(channelId)
    setChannelModalOpen(true)
    setInviteData(null)
    setShowChannelDropdown(false)
  }

  const createInvite = async (sendNow: boolean) => {
    if (!lead || !selectedChannelId) return
    setInviteLoading(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/invite-channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetChannelId: selectedChannelId, sendNow }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Fehler beim Erstellen der Einladung")
        return
      }
      const data = await res.json()
      setInviteData({ token: data.token, deepLink: data.deepLink, qrUrl: data.qrUrl, expiresAt: data.expiresAt })
      loadPendingInvites()
    } catch {
      alert("Netzwerkfehler")
    } finally {
      setInviteLoading(false)
    }
  }

  const saveNotes = useCallback(async (value: string) => {
    if (!lead) return
    const convId = (lead as any).conversationId || lead.id
    try {
      await fetch(`/api/conversations/${convId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customData: { notes: value } }),
      })
    } catch { /* silent */ }
  }, [lead])

  const saveCustomField = useCallback(async (key: string, value: unknown) => {
    if (!lead) return
    try {
      const convId = (lead as any).conversationId || lead.id
      await fetch(`/api/conversations/${convId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customData: { [key]: value } }),
      })
    } catch (err) {
      console.error("Save custom field error:", err)
    }
  }, [lead])

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

      const convId = (lead as any).conversationId || lead.id
      const res = await fetch(`/api/conversations/${convId}/messages`, {
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
                content: t('leadDrawer.aiSystemPrompt'),
              },
              {
                role: "user",
                content: `${t('leadDrawer.aiUserPromptPrefix')} ${lead.name || t('leadDrawer.customer')}. ${t('leadDrawer.lastMessageLabel')}: ${messages[messages.length - 1]?.content || t('leadDrawer.newContact')}`,
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
      const convId = (lead as any).conversationId || lead.id
      const res = await fetch(`/api/conversations/${convId}/freeze`, {
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

  const needsTelegramInvite = lead.channel === "telegram" && !(lead as any).externalId && !(lead as any).conversationId

  const locale = language === "de" ? "de-DE" : "en-US"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(lead.id)}`}>
              {getInitials(lead.name || lead.phone || "")}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {lead.name || lead.phone}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ChannelIcon channel={lead.channel || "whatsapp"} />
                <span>{lead.phone}</span>
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
          
          {/* Left: Chat or Telegram invite */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100 dark:border-gray-800">

            {needsTelegramInvite ? (
              <TelegramInviteUI leadId={lead.id} />
            ) : (<>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-sm">{t('leadDrawer.noMessages')}</p>
                  <p className="text-xs mt-1">{t('leadDrawer.startOrGenerate')}</p>
                  {aiEnabled && !isFrozen && (
                    <button
                      onClick={generateAiSuggestion}
                      className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
                    >
                      ✨ {t('leadDrawer.generateGreeting')}
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
                          msg.aiGenerated ? <span className="text-purple-500">✨ AI</span> : t('leadDrawer.you')
                        ) : (
                          lead.name || t('leadDrawer.customer')
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
                        {t('leadDrawer.acceptAndSend')}
                      </button>
                      <button
                        onClick={() => setAiSuggestion("")}
                        className="px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        {t('leadDrawer.dismiss')}
                      </button>
                      <button
                        onClick={generateAiSuggestion}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-white text-purple-600 text-sm rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? "..." : t('leadDrawer.regenerate')}
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
                    placeholder={t('leadDrawer.messagePlaceholder')}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => sendMessage(newMessage)}
                    disabled={!newMessage.trim()}
                    className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('leadDrawer.send')}
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
                      {isGenerating ? t('leadDrawer.generating') : t('leadDrawer.aiSuggestion')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-100 bg-blue-50 shrink-0">
                <p className="text-sm text-blue-700 text-center font-medium">
                  ❄️ {t('leadDrawer.frozenMessage')}
                </p>
              </div>
            )}
            </>)}
          </div>

          {/* Right: Data Panel */}
          <div className="w-80 bg-gray-50 dark:bg-gray-900 overflow-y-auto shrink-0">
            <div className="p-5 space-y-5">
              
              {/* Contact */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('leadDrawer.contact')}
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-xs text-gray-400">{t('leadDrawer.phone')}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('leadDrawer.source')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{lead.source || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{t('leadDrawer.channel')}</p>
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
                    <p className="text-xs text-gray-400">{t('leadDrawer.currentState')}</p>
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
                    <p className="text-xs text-gray-400">{t('leadDrawer.createdAt')}</p>
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

              {/* Channels */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Channels
                </h4>
                <div className="space-y-1.5 mb-2">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-gray-400">Keine aktiven Channels</p>
                  ) : (
                    conversations.map((conv) => (
                      <div key={conv.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <ChannelIcon channel={conv.channel} />
                        <span className="truncate">{conv.externalId || conv.id.slice(0, 8)}</span>
                        {conv.status !== "ACTIVE" && (
                          <span className="text-gray-400">({conv.status})</span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {pendingInvites.map((inv) => {
                      const ch = boardChannels.find((b) => b.id === inv.targetChannelId)
                      const days = Math.max(0, Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / 86400000))
                      return (
                        <div key={inv.id} className="flex items-center gap-2 text-xs">
                          <ChannelIcon channel={ch?.platform || "manual"} />
                          <span className="px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded border border-yellow-200 dark:border-yellow-800">
                            Pending — noch {days}d
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add channel dropdown */}
                {boardChannels.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowChannelDropdown((v) => !v)}
                      className="w-full text-xs px-3 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      + Channel hinzufügen
                    </button>
                    {showChannelDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowChannelDropdown(false)} />
                        <div className="absolute left-0 top-8 z-20 w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1">
                          {boardChannels
                            .filter((bc) => {
                              const hasConversation = conversations.some((c) => c.channel === bc.platform)
                              const hasPendingInvite = pendingInvites.some((inv) => inv.targetChannelId === bc.id)
                              return !hasConversation && !hasPendingInvite
                            })
                            .map((bc) => (
                              <button
                                key={bc.id}
                                onClick={() => handleAddChannel(bc.id)}
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <ChannelIcon channel={bc.platform} />
                                <span>{bc.platform === "telegram" ? "Telegram" : bc.platform === "whatsapp" ? "WhatsApp" : bc.platform}</span>
                              </button>
                            ))}
                          {boardChannels.filter((bc) => {
                            const hasConversation = conversations.some((c) => c.channel === bc.platform)
                            const hasPendingInvite = pendingInvites.some((inv) => inv.targetChannelId === bc.id)
                            return !hasConversation && !hasPendingInvite
                          }).length === 0 && (
                            <p className="px-3 py-2 text-xs text-gray-400">Alle Channels bereits verknüpft</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t('leadDrawer.notes')}
                </h4>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={(e) => saveNotes(e.target.value)}
                  placeholder={t('leadDrawer.notesPlaceholder')}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
                  rows={4}
                />
              </div>

              {/* Dynamic Custom Fields */}
              {fieldDefinitions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {t('leadDrawer.additionalFields')}
                  </h4>
                  <div className="space-y-3">
                    {fieldDefinitions.map((field) => {
                      const fieldKey = field.key || field.id || field.name || ""
                      const fieldLabel = field.label || field.name || fieldKey
                      const currentVal = customFields[fieldKey]
                      const inputClass = "w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"

                      return (
                        <div key={fieldKey}>
                          <label className="block text-xs text-gray-400 mb-1">
                            {fieldLabel}
                            {field.required && <span className="text-red-400 ml-0.5">*</span>}
                          </label>

                          {(field.type === "text" || field.type === "phone" || field.type === "email") && (
                            <input
                              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                              defaultValue={String(currentVal ?? "")}
                              className={inputClass}
                              onBlur={(e) => {
                                const val = e.target.value
                                setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                saveCustomField(fieldKey, val)
                              }}
                            />
                          )}

                          {field.type === "number" && (
                            <input
                              type="number"
                              defaultValue={String(currentVal ?? "")}
                              className={inputClass}
                              onBlur={(e) => {
                                const val = e.target.value ? Number(e.target.value) : null
                                setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                saveCustomField(fieldKey, val)
                              }}
                            />
                          )}

                          {field.type === "date" && (
                            <input
                              type="date"
                              defaultValue={String(currentVal ?? "")}
                              className={inputClass}
                              onBlur={(e) => {
                                const val = e.target.value
                                setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                saveCustomField(fieldKey, val)
                              }}
                            />
                          )}

                          {field.type === "boolean" && (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`field-${fieldKey}`}
                                defaultChecked={!!currentVal}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                onChange={(e) => {
                                  const val = e.target.checked
                                  setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                  saveCustomField(fieldKey, val)
                                }}
                              />
                              <label htmlFor={`field-${fieldKey}`} className="text-sm text-gray-700 dark:text-gray-300">
                                {fieldLabel}
                              </label>
                            </div>
                          )}

                          {field.type === "select" && field.options && (
                            <select
                              defaultValue={String(currentVal ?? "")}
                              className={inputClass}
                              onChange={(e) => {
                                const val = e.target.value
                                setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                saveCustomField(fieldKey, val)
                              }}
                            >
                              <option value="">— Auswählen —</option>
                              {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {field.type === "multiselect" && field.options && (
                            <div className="space-y-1">
                              {field.options.map(opt => {
                                const selected = Array.isArray(currentVal) && (currentVal as string[]).includes(opt)
                                return (
                                  <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      className="w-3.5 h-3.5 text-blue-600 rounded"
                                      onChange={(e) => {
                                        const prev = Array.isArray(currentVal) ? (currentVal as string[]) : []
                                        const next = e.target.checked ? [...prev, opt] : prev.filter(v => v !== opt)
                                        setCustomFields(p => ({ ...p, [fieldKey]: next }))
                                        saveCustomField(fieldKey, next)
                                      }}
                                    />
                                    {opt}
                                  </label>
                                )
                              })}
                            </div>
                          )}

                          {(!field.type || !["text","number","date","boolean","select","multiselect","phone","email"].includes(field.type)) && (
                            <input
                              type="text"
                              defaultValue={String(currentVal ?? "")}
                              className={inputClass}
                              onBlur={(e) => {
                                const val = e.target.value
                                setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                saveCustomField(fieldKey, val)
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
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
      {/* Channel invite modal */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Channel-Einladung</h3>
              <button
                onClick={() => { setChannelModalOpen(false); setInviteData(null) }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!inviteData ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Wie soll die Einladung übermittelt werden?
                </p>
                <button
                  onClick={() => createInvite(true)}
                  disabled={inviteLoading}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {inviteLoading ? "Wird erstellt…" : "Jetzt senden"}
                </button>
                <button
                  onClick={() => createInvite(false)}
                  disabled={inviteLoading}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {inviteLoading ? "Wird erstellt…" : "Nur Link generieren"}
                </button>
              </div>
            ) : (
              <ChannelInviteUI
                invite={inviteData}
                channel={boardChannels.find((b) => b.id === selectedChannelId)?.platform || "telegram"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
