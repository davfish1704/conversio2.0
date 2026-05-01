import { prisma } from "@/lib/db"
import { createInvite } from "@/lib/channel-invites"
import { sendMessage } from "@/lib/messaging/dispatcher"
import type { Tool, ToolResult, ToolExecutionContext } from "@/lib/tools/registry"
import type { Conversation, Board, State } from "@prisma/client"

export const suggestChannelSwitchTool: Tool = {
  name: "suggest_channel_switch",
  description:
    "Schlägt dem Lead einen Kanalwechsel vor und sendet einen Deep-Link. Nutze dieses Tool wenn der Lead auf einem anderen Kanal besser erreichbar wäre oder explizit einen Kanalwechsel anfragt.",
  parameters: {
    type: "object",
    properties: {
      targetChannel: {
        type: "string",
        enum: ["whatsapp", "telegram"],
        description: "Zielkanal für den Wechsel",
      },
      reason: {
        type: "string",
        description: "Kurze Begründung für den Kanalwechselvorschlag",
      },
    },
    required: ["targetChannel", "reason"],
  },

  async execute({
    args,
    conversation,
    board,
    context,
  }: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult> {
    const { targetChannel, reason } = args as { targetChannel: string; reason: string }

    if (context.simulate) {
      return {
        success: true,
        data: { suggested: true, targetChannel, reason },
        nextAction: "continue",
      }
    }

    try {
      // Anti-Spam: max 1 AI-getriggerter Invite pro Lead pro 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentCount = await (prisma as any).channelInvite.count({
        where: {
          leadId: conversation.leadId,
          createdBy: null,
          createdAt: { gte: since },
        },
      })
      if (recentCount >= 1) {
        return {
          success: false,
          error: "Kanalwechsel-Einladung wurde für diesen Lead bereits in den letzten 24h gesendet",
          nextAction: "continue",
        }
      }

      const boardChannel = await prisma.boardChannel.findUnique({
        where: { boardId_platform: { boardId: board.id, platform: targetChannel } },
        select: { id: true, status: true },
      })
      if (!boardChannel || boardChannel.status !== "connected") {
        return {
          success: false,
          error: `Zielkanal "${targetChannel}" ist nicht verbunden`,
          nextAction: "continue",
        }
      }

      const invite = await createInvite(conversation.leadId, boardChannel.id, undefined, reason)

      const brain = await (prisma as any).boardBrain.findUnique({
        where: { boardId: board.id },
        select: { channelSwitchTemplate: true },
      })
      const channelName = targetChannel === "telegram" ? "Telegram" : "WhatsApp"
      const template: string =
        (brain as any)?.channelSwitchTemplate ??
        "Du kannst diese Unterhaltung auch auf {channel} weiterführen: {link}"
      const message = template.replace("{channel}", channelName).replace("{link}", invite.deepLink)

      await sendMessage(conversation.id, message)

      await (prisma as any).executionLog.create({
        data: {
          boardId: board.id,
          conversationId: conversation.id,
          action: "suggest_channel_switch",
          input: JSON.stringify({ targetChannel, reason }),
          output: JSON.stringify({ token: invite.token, deepLink: invite.deepLink }),
          status: "SUCCESS",
        },
      })

      return {
        success: true,
        data: {
          suggested: true,
          targetChannel,
          token: invite.token,
          deepLink: invite.deepLink,
          expiresAt: invite.expiresAt,
        },
        nextAction: "continue",
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Kanalwechsel fehlgeschlagen",
        nextAction: "continue",
      }
    }
  },
}
