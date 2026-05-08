import { prisma } from "@/lib/db"

interface NotifyAdminParams {
  type: "FAILED_JOB" | "LEAD_STUCK" | "SYSTEM_ERROR"
  title: string
  body: string
  boardId?: string
  leadId?: string
  jobId?: string
}

export async function notifyAdmin(params: NotifyAdminParams): Promise<void> {
  await prisma.adminNotification.create({ data: params })

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
        subject: `[Conversio] ${params.title}`,
        text: params.body,
      }),
    }).catch(() => {})
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.ADMIN_TELEGRAM_CHAT_ID) {
    fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.ADMIN_TELEGRAM_CHAT_ID,
          text: `🚨 *${params.title}*\n\n${params.body}`,
          parse_mode: "Markdown",
        }),
      }
    ).catch(() => {})
  }
}
