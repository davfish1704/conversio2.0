import { prisma } from "@/lib/db"

export async function generateTelegramInviteLink(leadId: string): Promise<string> {
  const lead = await prisma.conversation.findUnique({
    where: { id: leadId },
    select: { boardId: true, channel: true },
  })
  if (!lead || lead.channel !== "telegram") {
    throw new Error("Lead ist kein Telegram-Lead")
  }
  if (!lead.boardId) {
    throw new Error("Lead ist keinem Board zugewiesen")
  }

  const channel = await prisma.boardChannel.findUnique({
    where: { boardId_platform: { boardId: lead.boardId, platform: "telegram" } },
    select: { telegramBotUsername: true, status: true },
  })
  if (!channel?.telegramBotUsername || channel.status !== "connected") {
    throw new Error("Telegram-Bot für dieses Board nicht verbunden")
  }

  // Telegram deep link: t.me/<bot>?start=<payload> — payload max 64 chars
  const payload = `lead_${leadId}`.slice(0, 64)
  return `https://t.me/${channel.telegramBotUsername}?start=${payload}`
}
