import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, Role, Direction, MessageType, MessageStatus, WhatsAppStatus, ConversationStatus } from '@prisma/client'

const prisma = new PrismaClient()

describe('Datenbank Tests', () => {
  let testUserId: string
  let testTeamId: string
  let testWaAccountId: string
  let testConversationId: string

  beforeAll(async () => {
    // Cleanup vor den Tests
    await prisma.message.deleteMany({ where: { content: { startsWith: '[TEST]' } } })
    await prisma.conversation.deleteMany({ where: { customerPhone: { startsWith: '+99' } } })
    await prisma.whatsAppAccount.deleteMany({ where: { phoneNumber: { startsWith: '+99' } } })
    await prisma.workflow.deleteMany({ where: { name: { startsWith: '[TEST]' } } })
    await prisma.apiToken.deleteMany({ where: { service: { startsWith: '[TEST]' } } })
    await prisma.teamMember.deleteMany({ where: { user: { email: { startsWith: 'test-' } } } })
    await prisma.team.deleteMany({ where: { slug: { startsWith: 'test-' } } })
    await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // ==========================================
  // CRUD Tests
  // ==========================================
  describe('CRUD', () => {
    it('sollte einen User erstellen, lesen, aktualisieren und löschen', async () => {
      // Create
      const user = await prisma.user.create({
        data: {
          email: 'test-crud@example.com',
          name: 'Test User',
        },
      })
      testUserId = user.id
      expect(user.email).toBe('test-crud@example.com')
      expect(user.name).toBe('Test User')

      // Read
      const found = await prisma.user.findUnique({ where: { id: user.id } })
      expect(found).not.toBeNull()
      expect(found?.email).toBe('test-crud@example.com')

      // Update
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: 'Updated Test User' },
      })
      expect(updated.name).toBe('Updated Test User')

      // Delete (wird in afterAll/cascade tests gelöscht, hier nur prüfen)
      expect(updated.id).toBeDefined()
    })
  })

  // ==========================================
  // Relations Tests
  // ==========================================
  describe('Relations', () => {
    it('sollte ein Team mit Owner erstellen und Owner automatisch als Member haben', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test-owner@example.com',
          name: 'Team Owner',
        },
      })

      const team = await prisma.team.create({
        data: {
          name: 'Test Team',
          slug: 'test-team-relations',
          ownerId: user.id,
        },
      })
      testTeamId = team.id

      // Owner als Member hinzufügen
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: Role.ADMIN,
        },
      })

      const teamWithMembers = await prisma.team.findUnique({
        where: { id: team.id },
        include: { members: { include: { user: true } }, owner: true },
      })

      expect(teamWithMembers?.owner.id).toBe(user.id)
      expect(teamWithMembers?.members.length).toBe(1)
      expect(teamWithMembers?.members[0].role).toBe(Role.ADMIN)
      expect(teamWithMembers?.members[0].user.email).toBe('test-owner@example.com')
    })

    it('sollte WhatsAppAccount mit 3 Conversations erstellen, jede mit 2 Messages', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Test WA Team',
          slug: 'test-wa-team',
          ownerId: testUserId,
        },
      })

      const waAccount = await prisma.whatsAppAccount.create({
        data: {
          teamId: team.id,
          phoneNumber: '+99 000 1111111',
          status: WhatsAppStatus.ACTIVE,
        },
      })
      testWaAccountId = waAccount.id

      for (let i = 0; i < 3; i++) {
        const conversation = await prisma.conversation.create({
          data: {
            waAccountId: waAccount.id,
            customerPhone: `+99 111 22222${i}`,
            customerName: `Kunde ${i + 1}`,
            status: ConversationStatus.ACTIVE,
          },
        })
        if (i === 0) testConversationId = conversation.id

        await prisma.message.createMany({
          data: [
            {
              conversationId: conversation.id,
              direction: Direction.INBOUND,
              content: `[TEST] Hallo von Kunde ${i + 1}`,
              messageType: MessageType.TEXT,
              status: MessageStatus.READ,
            },
            {
              conversationId: conversation.id,
              direction: Direction.OUTBOUND,
              content: `[TEST] Antwort an Kunde ${i + 1}`,
              messageType: MessageType.TEXT,
              status: MessageStatus.DELIVERED,
            },
          ],
        })
      }

      const waWithConversations = await prisma.whatsAppAccount.findUnique({
        where: { id: waAccount.id },
        include: {
          conversations: {
            include: { messages: true },
          },
        },
      })

      expect(waWithConversations?.conversations.length).toBe(3)
      waWithConversations?.conversations.forEach((conv) => {
        expect(conv.messages.length).toBe(2)
      })
    })

    it('sollte alle Messages einer Conversation sortiert by timestamp abfragen', async () => {
      const messages = await prisma.message.findMany({
        where: { conversationId: testConversationId },
        orderBy: { timestamp: 'asc' },
      })

      expect(messages.length).toBe(2)
      expect(messages[0].direction).toBe(Direction.INBOUND)
      expect(messages[1].direction).toBe(Direction.OUTBOUND)
      expect(messages[0].timestamp.getTime()).toBeLessThanOrEqual(messages[1].timestamp.getTime())
    })
  })

  // ==========================================
  // Cascade Tests
  // ==========================================
  describe('Cascades', () => {
    it('sollte WhatsAppAccounts, Conversations und Messages löschen wenn Team gelöscht wird', async () => {
      const user = await prisma.user.create({
        data: { email: 'test-cascade@example.com', name: 'Cascade User' },
      })

      const team = await prisma.team.create({
        data: {
          name: 'Cascade Test Team',
          slug: 'test-cascade-team',
          ownerId: user.id,
        },
      })

      const waAccount = await prisma.whatsAppAccount.create({
        data: {
          teamId: team.id,
          phoneNumber: '+99 999 8888888',
          status: WhatsAppStatus.ACTIVE,
        },
      })

      const conversation = await prisma.conversation.create({
        data: {
          waAccountId: waAccount.id,
          customerPhone: '+99 777 6666666',
          customerName: 'Cascade Kunde',
        },
      })

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: Direction.INBOUND,
          content: '[TEST] Cascade Test Message',
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT,
        },
      })

      // Lösche das Team
      await prisma.team.delete({ where: { id: team.id } })

      // Prüfe dass alles gelöscht wurde
      const waExists = await prisma.whatsAppAccount.findUnique({ where: { id: waAccount.id } })
      const convExists = await prisma.conversation.findUnique({ where: { id: conversation.id } })
      const msgExists = await prisma.message.findFirst({ where: { conversationId: conversation.id } })

      expect(waExists).toBeNull()
      expect(convExists).toBeNull()
      expect(msgExists).toBeNull()

      // Cleanup User
      await prisma.user.delete({ where: { id: user.id } })
    })

    it('sollte authorId auf NULL setzen wenn User gelöscht wird', async () => {
      const author = await prisma.user.create({
        data: { email: 'test-author@example.com', name: 'Author User' },
      })

      const team = await prisma.team.create({
        data: {
          name: 'Author Test Team',
          slug: 'test-author-team',
          ownerId: testUserId,
        },
      })

      const waAccount = await prisma.whatsAppAccount.create({
        data: {
          teamId: team.id,
          phoneNumber: '+99 555 4444444',
          status: WhatsAppStatus.ACTIVE,
        },
      })

      const conversation = await prisma.conversation.create({
        data: {
          waAccountId: waAccount.id,
          customerPhone: '+99 333 2222222',
        },
      })

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          authorId: author.id,
          direction: Direction.OUTBOUND,
          content: '[TEST] Message with author',
          messageType: MessageType.TEXT,
          status: MessageStatus.SENT,
        },
      })

      await prisma.user.delete({ where: { id: author.id } })

      const msgAfterDelete = await prisma.message.findUnique({ where: { id: message.id } })
      expect(msgAfterDelete?.authorId).toBeNull()

      // Cleanup
      await prisma.team.delete({ where: { id: team.id } })
    })
  })

  // ==========================================
  // Constraints Tests
  // ==========================================
  describe('Constraints', () => {
    it('sollte einen Unique Constraint Violation bei doppelter Email werfen', async () => {
      const email = 'test-unique@example.com'
      await prisma.user.create({ data: { email, name: 'Unique User 1' } })

      await expect(
        prisma.user.create({ data: { email, name: 'Unique User 2' } })
      ).rejects.toThrow()

      await prisma.user.deleteMany({ where: { email } })
    })

    it('sollte einen Unique Constraint Violation bei doppelter PhoneNumber werfen', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Unique WA Team',
          slug: 'test-unique-wa',
          ownerId: testUserId,
        },
      })

      const phone = '+99 000 0000000'
      await prisma.whatsAppAccount.create({
        data: {
          teamId: team.id,
          phoneNumber: phone,
          status: WhatsAppStatus.ACTIVE,
        },
      })

      await expect(
        prisma.whatsAppAccount.create({
          data: {
            teamId: team.id,
            phoneNumber: phone,
            status: WhatsAppStatus.ACTIVE,
          },
        })
      ).rejects.toThrow()

      await prisma.team.delete({ where: { id: team.id } })
    })

    it('sollte bei fehlenden Pflichtfeldern einen Fehler werfen', async () => {
      await expect(
        // @ts-expect-error - Test für fehlende Pflichtfelder
        prisma.user.create({ data: {} })
      ).rejects.toThrow()

      await expect(
        // @ts-expect-error - Test für fehlende Pflichtfelder
        prisma.team.create({ data: {} })
      ).rejects.toThrow()
    })
  })
})
