import { PrismaClient, Direction, MessageType, MessageStatus, WhatsAppStatus, ConversationStatus, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starte Seeding...')

  // Cleanup vorhandener Seed-Daten
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Hallo' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Guten Tag' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Können Sie' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Ja, die' } } })
  await prisma.message.deleteMany({ where: { content: { startsWith: 'Nein,' } } })
  await prisma.conversation.deleteMany({ where: { customerPhone: { startsWith: '+49 157' } } })
  await prisma.conversation.deleteMany({ where: { customerPhone: { startsWith: '+49 170' } } })
  await prisma.conversation.deleteMany({ where: { customerPhone: { startsWith: '+49 171' } } })
  await prisma.conversation.deleteMany({ where: { customerPhone: { startsWith: '+49 172' } } })
  await prisma.whatsAppAccount.deleteMany({ where: { phoneNumber: '+49 157 31329868' } })
  await prisma.workflow.deleteMany({ where: { name: 'Willkommenssequenz' } })
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

  // 4. WhatsApp Account
  const waAccount = await prisma.whatsAppAccount.create({
    data: {
      teamId: team.id,
      phoneNumber: '+49 157 31329868',
      wabaId: 'waba_123456789',
      status: WhatsAppStatus.ACTIVE,
      webhookUrl: 'https://conversio.app/api/webhooks/whatsapp',
    },
  })
  console.log('📱 WhatsApp Account erstellt:', waAccount.phoneNumber)

  // 5. Conversations mit Kunden
  const customers = [
    { name: 'Anna Müller', phone: '+49 170 1234567' },
    { name: 'Thomas Weber', phone: '+49 171 7654321' },
    { name: 'Lisa Fischer', phone: '+49 172 9876543' },
  ]

  for (const customer of customers) {
    const conversation = await prisma.conversation.create({
      data: {
        waAccountId: waAccount.id,
        customerPhone: customer.phone,
        customerName: customer.name,
        status: ConversationStatus.ACTIVE,
      },
    })
    console.log('💬 Conversation erstellt:', customer.name)

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

    // Für jede Conversation nur 3-5 Messages, wir nehmen alle 5
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

  // 7. Workflow
  const workflow = await prisma.workflow.create({
    data: {
      teamId: team.id,
      name: 'Willkommenssequenz',
      triggerType: 'new_conversation',
      isActive: true,
      config: {
        steps: [
          { type: 'delay', value: 5, unit: 'minutes' },
          { type: 'send_message', template: 'welcome_message_1' },
          { type: 'delay', value: 24, unit: 'hours' },
          { type: 'send_message', template: 'follow_up_1' },
        ],
      },
    },
  })
  console.log('⚙️ Workflow erstellt:', workflow.name)

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
