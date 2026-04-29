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

export interface WhatsAppAccount {
  id: string
  teamId: string
  phoneNumber: string
  wabaId?: string | null
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'ERROR'
  webhookUrl?: string | null
  accessTokenEncrypted?: string | null
  createdAt: Date
}

export interface Conversation {
  id: string
  waAccountId: string
  customerPhone: string
  customerName?: string | null
  customerAvatar?: string | null
  lastMessageAt: Date
  status: 'ACTIVE' | 'ARCHIVED' | 'SPAM'
  leadScore?: number | null
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

export interface Workflow {
  id: string
  teamId: string
  name: string
  triggerType: string
  config: Record<string, unknown>
  isActive: boolean
  createdAt: Date
}

export interface ApiToken {
  id: string
  teamId: string
  service: string
  encryptedToken: string
  scopes: string[]
  expiresAt?: Date | null
  createdAt: Date
}
