export interface User {
  id: string
  email: string
  name?: string | null
  googleId?: string | null
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  id: string
  name: string
  slug: string
  ownerId: string
  plan: string
  createdAt: Date
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: Date
}

export interface Lead {
  id: string
  boardId: string
  currentStateId?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  avatar?: string | null
  source?: string | null
  channel?: string | null
  tags: string[]
  leadScore?: number | null
  stateHistory?: unknown
  customData: Record<string, unknown>
  assignedToId?: string | null
  createdAt: Date
  updatedAt: Date
  conversations?: Conversation[]
}

export interface Conversation {
  id: string
  leadId: string
  lead?: Lead
  boardId?: string | null
  currentStateId?: string | null
  channel: string
  externalId?: string | null
  aiEnabled?: boolean
  frozen?: boolean
  status: 'ACTIVE' | 'ARCHIVED' | 'SPAM'
  lastMessageAt?: Date | null
  customData?: Record<string, unknown>
  createdAt?: Date
  updatedAt?: Date
}

export interface Message {
  id: string
  conversationId: string
  authorId?: string | null
  direction: 'INBOUND' | 'OUTBOUND'
  content: string
  mediaUrl?: string | null
  messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'TEMPLATE' | 'LOCATION'
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  externalId?: string | null
  timestamp: Date
  metadata?: Record<string, unknown> | null
}
