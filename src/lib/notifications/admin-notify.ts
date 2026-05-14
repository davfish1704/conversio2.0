import { prisma } from "@/lib/db"
import type { NotificationLevel } from "@prisma/client"

export interface NotifyAdminParams {
  level: NotificationLevel
  title: string
  message: string
  boardId?: string
  leadId?: string
  metadata?: Record<string, unknown>
}

export async function notifyAdmin(params: NotifyAdminParams): Promise<void> {
  await prisma.adminNotification.create({
    data: {
      level: params.level,
      title: params.title,
      message: params.message,
      boardId: params.boardId ?? null,
      leadId: params.leadId ?? null,
      metadata: JSON.parse(JSON.stringify(params.metadata ?? {})),
    },
  }).catch(() => {})

  if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Conversio System <noreply@conversio.de>",
        to: process.env.ADMIN_EMAIL,
        subject: `[Conversio ${params.level}] ${params.title}`,
        text: params.message,
      }),
    }).catch(() => {})
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID) {
    const levelEmoji: Record<NotificationLevel, string> = {
      INFO: "ℹ️",
      WARNING: "⚠️",
      ERROR: "🔴",
      CRITICAL: "🚨",
    }
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.ADMIN_TELEGRAM_CHAT_ID,
          text: `${levelEmoji[params.level]} *${params.title}*\n\n${params.message}`,
          parse_mode: "Markdown",
        }),
      },
    ).catch(() => {})
  }
}
