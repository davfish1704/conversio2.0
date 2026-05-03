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

  const existing = await (prisma as any).channelInvite.findFirst({
    where: { leadId, targetChannelId, status: "PENDING", expiresAt: { gt: new Date() } },
  })
  if (existing) {
    const deepLink = buildDeepLink(boardChannel.platform, boardChannel, existing.token)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`
    return { id: existing.id, token: existing.token, deepLink, qrUrl, expiresAt: existing.expiresAt }
  }

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

export async function createBoardInvite(
  boardId: string,
  targetChannelId: string,
  options?: { campaign?: string; createdBy?: string; expiresInDays?: number }
): Promise<InviteResult> {
  const boardChannel = await prisma.boardChannel.findUnique({
    where: { id: targetChannelId },
    select: { boardId: true, platform: true, status: true, waPhoneNumberId: true, telegramBotUsername: true },
  })
  if (!boardChannel) throw new Error("Zielkanal nicht gefunden")
  if (boardChannel.boardId !== boardId) throw new Error("Zielkanal gehört nicht zu diesem Board")
  if (boardChannel.status !== "connected") throw new Error(`Kanal nicht verbunden (Status: ${boardChannel.status})`)
  if (boardChannel.platform !== "telegram" && boardChannel.platform !== "whatsapp") {
    throw new Error(`Plattform '${boardChannel.platform}' wird noch nicht unterstützt`)
  }

  const existing = await (prisma as any).channelInvite.findFirst({
    where: {
      boardId,
      targetChannelId,
      source: "BOARD_ACQUISITION",
      status: "PENDING",
      expiresAt: { gt: new Date() },
      campaign: options?.campaign ?? null,
    },
  })
  if (existing) {
    const deepLink = buildDeepLink(boardChannel.platform, boardChannel, existing.token)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`
    return { id: existing.id, token: existing.token, deepLink, qrUrl, expiresAt: existing.expiresAt }
  }

  const token = generateToken()
  const days = options?.expiresInDays ?? 90
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const invite = await (prisma as any).channelInvite.create({
    data: {
      boardId,
      leadId: null,
      source: "BOARD_ACQUISITION",
      campaign: options?.campaign ?? null,
      targetChannelId,
      token,
      status: "PENDING",
      createdBy: options?.createdBy ?? null,
      expiresAt,
    },
  })

  const deepLink = buildDeepLink(boardChannel.platform, boardChannel, token)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`

  return { id: invite.id, token, deepLink, qrUrl, expiresAt }
}

export function buildDeepLink(
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
