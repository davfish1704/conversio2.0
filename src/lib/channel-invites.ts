import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"

const TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function generateToken(): string {
  const bytes = randomBytes(12)
  return Array.from(bytes)
    .map((b) => TOKEN_CHARS[b % TOKEN_CHARS.length])
    .join("")
}

export interface InviteResult {
  id: string
  token: string
  deepLink: string
  qrUrl: string
  expiresAt: Date
}

export async function createInvite(
  leadId: string,
  targetChannelId: string,
  createdBy?: string,
  reason?: string
): Promise<InviteResult> {
  const lead = await (prisma as any).lead.findUnique({
    where: { id: leadId },
    select: { boardId: true },
  })
  if (!lead) throw new Error("Lead nicht gefunden")

  const boardChannel = await prisma.boardChannel.findUnique({
    where: { id: targetChannelId },
    select: { platform: true, waPhoneNumberId: true, telegramBotUsername: true },
  })
  if (!boardChannel) throw new Error("Zielkanal nicht gefunden")

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await (prisma as any).channelInvite.create({
    data: {
      boardId: lead.boardId,
      leadId,
      targetChannelId,
      token,
      status: "PENDING",
      createdBy: createdBy ?? null,
      reason: reason ?? null,
      expiresAt,
    },
  })

  const deepLink = buildDeepLink(boardChannel.platform, boardChannel, token)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`

  return { id: invite.id, token, deepLink, qrUrl, expiresAt }
}

function buildDeepLink(
  platform: string,
  channel: { waPhoneNumberId?: string | null; telegramBotUsername?: string | null },
  token: string
): string {
  if (platform === "whatsapp") {
    return `https://wa.me/${channel.waPhoneNumberId ?? ""}?text=${encodeURIComponent(`Start ${token}`)}`
  }
  if (platform === "telegram") {
    return `https://t.me/${channel.telegramBotUsername ?? ""}?start=${token}`
  }
  throw new Error(`Nicht unterstützter Zielkanal: ${platform}`)
}

export async function consumeInvite(token: string, newConversationId: string) {
  return (prisma as any).channelInvite.update({
    where: { token },
    data: {
      status: "CONSUMED",
      consumedAt: new Date(),
      consumedConversationId: newConversationId,
    },
  })
}

export async function findInviteByToken(token: string) {
  return (prisma as any).channelInvite.findUnique({
    where: { token },
    include: {
      lead: { select: { id: true, boardId: true, name: true, currentStateId: true } },
    },
  })
}
