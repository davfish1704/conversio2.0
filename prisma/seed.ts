import { PrismaClient, Direction, MessageType, MessageStatus, ConversationStatus, Role } from '@prisma/client'
// Note: WhatsAppAccount, Workflow, and WhatsAppStatus no longer exist in v3 schema

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starte Seeding...')

  // Cleanup vorhandener Seed-Daten
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Hallo' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Guten Tag' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Können Sie' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Ja, die' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Nein,' } } })
  // v3: Leads hold the phone numbers now; conversations link via leadId
  await (prisma as any).lead.deleteMany({ where: { phone: { startsWith: '+49 157' } } })
  await (prisma as any).lead.deleteMany({ where: { phone: { startsWith: '+49 170' } } })
  await (prisma as any).lead.deleteMany({ where: { phone: { startsWith: '+49 171' } } })
  await (prisma as any).lead.deleteMany({ where: { phone: { startsWith: '+49 172' } } })
  // WhatsAppAccount and Workflow no longer exist in v3 schema
  await prisma.teamMember.deleteMany({ where: { user: { email: 'max@schmidt-versicherung.de' } } })
  await prisma.team.deleteMany({ where: { slug: 'schmidt-versicherung' } })
  await prisma.user.deleteMany({ where: { email: 'max@schmidt-versicherung.de' } })

  // 1. User erstellen (Owner)
  const owner = await prisma.user.create({
    data: {
      email: 'max@schmidt-versicherung.de',
      name: 'Max Schmidt',
      googleId: 'google_max_schmidt_001',
      image: 'https://ui-avatars.com/api/?name=Max+Schmidt&background=0D8ABC&color=fff',
    },
  })
  console.log('👤 Owner erstellt:', owner.email)

  // 2. Team erstellen
  const team = await prisma.team.create({
    data: {
      name: 'Versicherungsmakler Schmidt GmbH',
      slug: 'schmidt-versicherung',
      ownerId: owner.id,
      plan: 'pro',
    },
  })
  console.log('🏢 Team erstellt:', team.name)

  // 3. Team-Mitgliedschaft für Owner (ADMIN)
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: owner.id,
      role: Role.ADMIN,
    },
  })
  console.log('🤝 Owner als Admin zum Team hinzugefügt')

  // 4. Board erstellen (v3: kein WhatsAppAccount mehr, WA-Config kommt über BoardChannel)
  const board = await (prisma as any).board.create({
    data: {
      name: 'Versicherungs-Pipeline',
      slug: 'versicherungs-pipeline',
      teamId: team.id,
      isActive: true,
      members: {
        create: { userId: owner.id, role: 'ADMIN' },
      },
    },
  })
  console.log('📋 Board erstellt:', board.name)

  // 5. Leads + Conversations (v3: Lead ist der CRM-Kontakt, Conversation ist der Messaging-Thread)
  const customers = [
    { name: 'Anna Müller', phone: '+49 170 1234567' },
    { name: 'Thomas Weber', phone: '+49 171 7654321' },
    { name: 'Lisa Fischer', phone: '+49 172 9876543' },
  ]

  for (const customer of customers) {
    // Lead erstellen
    const lead = await (prisma as any).lead.create({
      data: {
        boardId: board.id,
        name: customer.name,
        phone: customer.phone,
        source: 'whatsapp',
        channel: 'whatsapp',
        tags: [],
        customData: {},
      },
    })

    // Conversation für diesen Lead erstellen
    const conversation = await (prisma as any).conversation.create({
      data: {
        leadId: lead.id,
        boardId: board.id,
        channel: 'whatsapp',
        status: ConversationStatus.ACTIVE,
      },
    })
    console.log('💬 Lead + Conversation erstellt:', customer.name)

    // 6. Messages für jede Conversation
    const messages = [
      {
        direction: Direction.INBOUND,
        content: `Hallo, hier ist ${customer.name}. Ich habe eine Frage zu meiner Kfz-Versicherung.`,
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
      },
      {
        direction: Direction.OUTBOUND,
        content: `Guten Tag ${customer.name}, vielen Dank für Ihre Nachricht. Gerne helfe ich Ihnen weiter.`,
        messageType: MessageType.TEXT,
        status: MessageStatus.DELIVERED,
        authorId: owner.id,
      },
      {
        direction: Direction.INBOUND,
        content: 'Können Sie mir sagen, ob meine Teilkasko auch Glasschäden abdeckt?',
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
      },
      {
        direction: Direction.OUTBOUND,
        content: 'Ja, die Teilkasko deckt Glasschäden ab. Möchten Sie einen Schaden melden?',
        messageType: MessageType.TEXT,
        status: MessageStatus.DELIVERED,
        authorId: owner.id,
      },
      {
        direction: Direction.INBOUND,
        content: 'Nein, ich wollte nur sichergehen. Danke!',
        messageType: MessageType.TEXT,
        status: MessageStatus.READ,
      },
    ]

    for (const msg of messages) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: msg.direction,
          content: msg.content,
          messageType: msg.messageType,
          status: msg.status,
          authorId: msg.authorId || null,
        },
      })
    }
    console.log('✉️ 5 Messages erstellt für:', customer.name)
  }

  // 7. Workflow-Äquivalent: In v3 gibt es kein Workflow-Modell mehr.
  // Automation wird über Board-States und AI-Flows abgebildet.
  console.log('ℹ️  Workflow-Seeding übersprungen (v3: kein Workflow-Modell)')

  console.log('✅ Seeding erfolgreich abgeschlossen!')
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
