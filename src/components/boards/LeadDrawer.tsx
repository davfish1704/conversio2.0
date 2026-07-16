"use client"

import { useState, useEffect, useCallback, useRef, useContext } from "react"
import { Trash2, X, Sparkles, Snowflake, ChevronDown, ChevronRight, Plus } from "lucide-react"
import { type Lead } from "./LeadCard"
import { getInitials, getAvatarColor, formatRelativeTime } from "@/lib/utils/formatting"
import { LanguageContext } from "@/lib/LanguageContext"
import TelegramInviteUI from "@/components/leads/TelegramInviteUI"
import WhatsAppInviteUI from "@/components/leads/WhatsAppInviteUI"
import ChannelInviteUI from "@/components/leads/ChannelInviteUI"
import AgentRunTimeline from "@/components/boards/AgentRunTimeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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
  name?: string
  type: string
  required?: boolean
  options?: string[]
  unit?: string
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
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium">Manuell</span>
        </span>
      )
    default:
      return <span className="text-muted-foreground text-xs">—</span>
  }
}

export default function LeadDrawer({ lead, states, boardId, onClose, onUpdate }: LeadDrawerProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "ai-activity">("chat")
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t, language } = useContext(LanguageContext)
  const { toast } = useToast()

  const loadMessages = useCallback(async () => {
    if (!lead) return
    setIsLoading(true)
    try {
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
      setCustomFields((leadAny.customData as Record<string, unknown>) || {})
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
    } catch (err) { console.error("Conversations fetch error:", err) }
  }, [lead])

  const loadBoardChannels = useCallback(async () => {
    if (!boardId) return
    try {
      const res = await fetch(`/api/boards/${boardId}/channels`)
      if (!res.ok) return
      const data = await res.json()
      setBoardChannels((data.channels || []).filter((c: BoardChannelOption) => c.status === "connected"))
    } catch (err) { console.error("Board channels fetch error:", err) }
  }, [boardId])

  const loadPendingInvites = useCallback(async () => {
    if (!lead) return
    try {
      const res = await fetch(`/api/leads/${lead.id}/invites`)
      if (!res.ok) return
      const data = await res.json()
      setPendingInvites(data.invites || [])
    } catch (err) { console.error("Pending invites fetch error:", err) }
  }, [lead])

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
  }, [lead, loadMessages, loadFieldDefinitions, loadConversations, loadBoardChannels, loadPendingInvites])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
        toast({ title: err.error || "Fehler beim Erstellen der Einladung", variant: "destructive" })
        return
      }
      const data = await res.json()
      setInviteData({ token: data.token, deepLink: data.deepLink, qrUrl: data.qrUrl, expiresAt: data.expiresAt })
      loadPendingInvites()
    } catch {
      toast({ title: "Netzwerkfehler", variant: "destructive" })
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
    } catch (err) { console.error("Save notes error:", err) }
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

  const handleDeleteLead = async () => {
    if (!lead) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setShowDeleteConfirm(false)
      onClose()
      onUpdate()
    } catch (err) {
      console.error("Delete lead error:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!lead) return null

  const needsTelegramInvite = lead.channel === "telegram" && !(lead as any).externalId && !(lead as any).conversationId
  const needsWhatsAppInvite = lead.channel === "whatsapp" && !(lead as any).externalId && !(lead as any).conversationId

  const locale = language === "de" ? "de-DE" : "en-US"

  const fieldInputClass = "w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Modal Container */}
      <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 ${getAvatarColor(lead.id)}`}>
              {getInitials(lead.name || lead.phone || "")}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {lead.name || lead.phone}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <ChannelIcon channel={lead.channel || "whatsapp"} />
                <span>{lead.phone}</span>
                <span>·</span>
                <span>{formatRelativeTime(lead.lastMessageAt, language)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleAi}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                aiEnabled
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Sparkles className="w-3 h-3" />
              {aiEnabled ? "KI an" : "KI aus"}
            </button>

            <button
              onClick={toggleFreeze}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                isFrozen
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <Snowflake className="w-3 h-3" />
              {isFrozen ? "Eingefroren" : "Freeze"}
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Lead löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content: Chat + Data Side by Side */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Chat / AI Activity / Telegram invite */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border">

            {/* Tab bar */}
            {!needsTelegramInvite && !needsWhatsAppInvite && (
              <div className="flex items-center border-b border-border px-4 shrink-0">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={cn(
                    "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px]",
                    activeTab === "chat"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab("ai-activity")}
                  className={cn(
                    "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-[1px]",
                    activeTab === "ai-activity"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  AI Activity
                </button>
              </div>
            )}

            {needsTelegramInvite ? (
              <TelegramInviteUI leadId={lead.id} />
            ) : needsWhatsAppInvite ? (
              <WhatsAppInviteUI leadId={lead.id} />
            ) : activeTab === "ai-activity" ? (
              <div className="flex-1 overflow-y-auto p-4">
                <AgentRunTimeline leadId={lead.id} />
              </div>
            ) : (<>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-sm">{t('leadDrawer.noMessages')}</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">{t('leadDrawer.startOrGenerate')}</p>
                  {aiEnabled && !isFrozen && (
                    <button
                      onClick={generateAiSuggestion}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary text-xs rounded-md hover:bg-primary/15 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      {t('leadDrawer.generateGreeting')}
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
                      <div className={cn(
                        "text-[10px] text-muted-foreground mb-1 px-1",
                        msg.direction === "OUTBOUND" ? "text-right" : "text-left"
                      )}>
                        {msg.direction === "OUTBOUND" ? (
                          msg.aiGenerated
                            ? <span className="text-primary inline-flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> KI</span>
                            : t('leadDrawer.you')
                        ) : (
                          lead.name || t('leadDrawer.customer')
                        )}
                      </div>

                      <div className={cn(
                        "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                        msg.direction === "OUTBOUND"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}>
                        {msg.content}
                      </div>

                      <div className={cn(
                        "flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground",
                        msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                      )}>
                        <span>{new Date(msg.timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
                        {msg.status === "SENDING" && <span className="text-warning">⏳</span>}
                        {msg.status === "FAILED" && <span className="text-destructive">✗</span>}
                        {msg.status === "SENT" && msg.direction === "OUTBOUND" && <span className="text-primary/60">✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestion */}
            {aiSuggestion && !isFrozen && aiEnabled && (
              <div className="px-4 py-3 bg-primary/5 border-t border-primary/15 shrink-0">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{aiSuggestion}</p>
                    <div className="flex gap-2 mt-2.5 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => sendMessage(aiSuggestion, true)}
                      >
                        {t('leadDrawer.acceptAndSend')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAiSuggestion("")}
                      >
                        {t('leadDrawer.dismiss')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={generateAiSuggestion}
                        disabled={isGenerating}
                        className="text-primary hover:text-primary"
                      >
                        {isGenerating ? "…" : t('leadDrawer.regenerate')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            {!isFrozen ? (
              <div className="p-4 border-t border-border shrink-0 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(newMessage)}
                    placeholder={t('leadDrawer.messagePlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage(newMessage)}
                    disabled={!newMessage.trim()}
                    size="sm"
                    className="px-4"
                  >
                    {t('leadDrawer.send')}
                  </Button>
                </div>
                {aiEnabled && (
                  <button
                    onClick={generateAiSuggestion}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-primary bg-primary/10 rounded-md hover:bg-primary/15 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGenerating ? t('leadDrawer.generating') : t('leadDrawer.aiSuggestion')}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 border-t border-border bg-muted/50 shrink-0">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Snowflake className="w-3.5 h-3.5" />
                  {t('leadDrawer.frozenMessage')}
                </div>
              </div>
            )}
            </>)}
          </div>

          {/* Right: Data Panel */}
          <div className="w-72 bg-muted/20 overflow-y-auto shrink-0">
            <div className="p-4 space-y-5">

              {/* Contact */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  {t('leadDrawer.contact')}
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('leadDrawer.phone')}</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">{lead.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Name</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">{lead.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('leadDrawer.source')}</p>
                    <p className="text-xs text-foreground mt-0.5">{lead.source || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('leadDrawer.channel')}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ChannelIcon channel={lead.channel || "whatsapp"} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Status */}
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Status
                </h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('leadDrawer.currentState')}</p>
                    <p className="text-xs font-medium text-foreground mt-0.5">
                      {states.find((s) => s.id === lead.currentStateId)?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Lead Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min((lead.leadScore || 0) * 10, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground tabular-nums">{lead.leadScore || 0}/10</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('leadDrawer.createdAt')}</p>
                    <p className="text-xs text-foreground mt-0.5">
                      {new Date(lead.createdAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {lead.tags.length > 0 && (
                <>
                  <div className="border-t border-border" />
                  <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-medium bg-muted text-foreground rounded-md border border-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Channels */}
              <div className="border-t border-border" />
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Channels
                </h4>
                <div className="space-y-1.5 mb-2">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Keine aktiven Channels</p>
                  ) : (
                    conversations.map((conv) => (
                      <div key={conv.id} className="flex items-center gap-2 text-xs text-foreground">
                        <ChannelIcon channel={conv.channel} />
                        <span className="truncate text-muted-foreground">{conv.externalId || conv.id.slice(0, 8)}</span>
                        {conv.status !== "ACTIVE" && (
                          <span className="text-muted-foreground/60">({conv.status})</span>
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
                          <span className="px-1.5 py-0.5 bg-warning/10 text-warning rounded border border-warning/20 text-[10px]">
                            Ausstehend — noch {days}d
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
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 border border-dashed border-border rounded-md text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Channel hinzufügen
                    </button>
                    {showChannelDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowChannelDropdown(false)} />
                        <div className="absolute left-0 top-9 z-20 w-full bg-popover rounded-lg border border-border shadow-md py-1">
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
                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted transition-colors"
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
                            <p className="px-3 py-2 text-xs text-muted-foreground">Alle Channels bereits verknüpft</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="border-t border-border" />
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('leadDrawer.notes')}
                </h4>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={(e) => saveNotes(e.target.value)}
                  placeholder={t('leadDrawer.notesPlaceholder')}
                  className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                />
              </div>

              {/* Qualification Fields */}
              {fieldDefinitions.length > 0 && (() => {
                const sortedFields = [...fieldDefinitions].sort((a, b) => {
                  const keyA = a.key || a.id || a.name || ""
                  const keyB = b.key || b.id || b.name || ""
                  const filledA = customFields[keyA] !== undefined && customFields[keyA] !== null && customFields[keyA] !== ""
                  const filledB = customFields[keyB] !== undefined && customFields[keyB] !== null && customFields[keyB] !== ""
                  const rankA = filledA ? 2 : a.required ? 0 : 1
                  const rankB = filledB ? 2 : b.required ? 0 : 1
                  return rankA - rankB
                })
                const requiredFields = fieldDefinitions.filter(f => f.required)
                const filledRequired = requiredFields.filter(f => {
                  const v = customFields[f.key || f.id || f.name || ""]
                  return v !== undefined && v !== null && v !== ""
                })
                return (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Qualifizierung
                        </h4>
                        {requiredFields.length > 0 && (
                          <span className={cn(
                            "text-[10px] tabular-nums font-medium",
                            filledRequired.length === requiredFields.length
                              ? "text-emerald-500"
                              : "text-muted-foreground"
                          )}>
                            {filledRequired.length}/{requiredFields.length} Pflicht
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {sortedFields.map((field) => {
                          const fieldKey = field.key || field.id || field.name || ""
                          const fieldLabel = field.label || field.name || fieldKey
                          const currentVal = customFields[fieldKey]
                          const isFilled = currentVal !== undefined && currentVal !== null && currentVal !== ""
                          const isRequired = !!field.required
                          const inputCls = cn(
                            fieldInputClass,
                            isRequired && !isFilled && "border-destructive/40 focus:ring-destructive/20"
                          )

                          return (
                            <div key={fieldKey} className={cn(!isFilled && !isRequired && "opacity-60")}>
                              <div className="flex items-center gap-1 mb-1">
                                <span className={cn(
                                  "text-[10px]",
                                  isFilled ? "text-muted-foreground" : isRequired ? "text-foreground font-medium" : "text-muted-foreground"
                                )}>
                                  {fieldLabel}
                                </span>
                                {isRequired && !isFilled && <span className="text-destructive text-[10px]">*</span>}
                                {isFilled && <span className="text-emerald-500 text-[10px]">✓</span>}
                                {!isRequired && !isFilled && <span className="text-muted-foreground/50 text-[10px]">(optional)</span>}
                                {field.unit && <span className="text-muted-foreground/50 text-[10px] ml-auto">{field.unit}</span>}
                              </div>

                              {(field.type === "text" || field.type === "phone" || field.type === "email") && (
                                <input
                                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                                  defaultValue={String(currentVal ?? "")}
                                  className={inputCls}
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
                                  className={inputCls}
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
                                  className={inputCls}
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
                                    className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
                                    onChange={(e) => {
                                      const val = e.target.checked
                                      setCustomFields(prev => ({ ...prev, [fieldKey]: val }))
                                      saveCustomField(fieldKey, val)
                                    }}
                                  />
                                  <label htmlFor={`field-${fieldKey}`} className="text-xs text-foreground">
                                    {fieldLabel}
                                  </label>
                                </div>
                              )}

                              {(field.type === "select" || field.type === "enum") && field.options && (
                                <select
                                  defaultValue={String(currentVal ?? "")}
                                  className={inputCls}
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
                                      <label key={opt} className="flex items-center gap-2 text-xs text-foreground">
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          className="w-3.5 h-3.5 rounded border-input text-primary"
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

                              {(!field.type || !["text","number","date","boolean","select","enum","multiselect","phone","email"].includes(field.type)) && (
                                <input
                                  type="text"
                                  defaultValue={String(currentVal ?? "")}
                                  className={fieldInputClass}
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
                  </>
                )
              })()}

              {/* State History Toggle */}
              <div className="border-t border-border" />
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium py-1 transition-colors"
              >
                {showHistory
                  ? <ChevronDown className="w-3 h-3" />
                  : <ChevronRight className="w-3 h-3" />
                }
                State-Verlauf
              </button>

              {showHistory && (
                <div className="space-y-2 text-xs">
                  {((lead.stateHistory as any[]) || []).map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-muted-foreground/50 mt-0.5">→</span>
                      <div>
                        <span className="font-medium text-foreground">{entry.fromStateName || "Start"}</span>
                        {" → "}
                        <span className="font-medium text-foreground">
                          {states.find((s) => s.id === entry.toStateId)?.name || "?"}
                        </span>
                        <p className="text-muted-foreground mt-0.5">
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Lead löschen?</h3>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{lead.name || lead.phone}</strong> wird unwiderruflich gelöscht — inkl. aller Nachrichten und Daten.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteLead}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? "Löschen…" : "Endgültig löschen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Channel invite modal */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Channel-Einladung</h3>
              <button
                onClick={() => { setChannelModalOpen(false); setInviteData(null) }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!inviteData ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Wie soll die Einladung übermittelt werden?
                </p>
                <Button
                  onClick={() => createInvite(true)}
                  disabled={inviteLoading}
                  className="w-full"
                >
                  {inviteLoading ? "Wird erstellt…" : "Jetzt senden"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => createInvite(false)}
                  disabled={inviteLoading}
                  className="w-full"
                >
                  {inviteLoading ? "Wird erstellt…" : "Nur Link generieren"}
                </Button>
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
