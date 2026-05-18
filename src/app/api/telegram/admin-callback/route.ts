import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { updateNotificationMessage } from "@/lib/admin-notifier/admin-notifier"
import { enqueueJob } from "@/lib/jobs/enqueue"

const BOT_TOKEN = () => process.env.ADMIN_TELEGRAM_BOT_TOKEN ?? ""
const ALLOWED_IDS = () => (process.env.ADMIN_ALLOWED_TELEGRAM_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean)

function jsonOk() {
  return NextResponse.json({ ok: true })
}

function jsonError(msg: string, status = 200) {
  return NextResponse.json({ error: msg }, { status })
}

/**
 * Telegram callback_data format: supervisor:{action}:{actionId}
 *   action = approve | reject | snooze
 */
const CALLBACK_RE = /^supervisor:(approve|reject|snooze):(\w+)$/

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const token = BOT_TOKEN()
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text ?? "",
      show_alert: false,
    }),
  }).catch(() => {})
}

async function editMessageText(
  chatId: string,
  messageId: number,
  text: string,
  removeButtons = true,
) {
  const token = BOT_TOKEN()
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "Markdown",
      ...(removeButtons ? { reply_markup: { inline_keyboard: [] } } : {}),
    }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const botToken = BOT_TOKEN()
  if (!botToken) {
    return jsonError("ADMIN_TELEGRAM_BOT_TOKEN not configured")
  }

  const allowedIds = ALLOWED_IDS()
  if (allowedIds.length === 0) {
    console.warn("[admin-callback] ADMIN_ALLOWED_TELEGRAM_IDS is empty — no users allowed")
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError("Invalid JSON")
  }

  const callbackQuery = body.callback_query as Record<string, unknown> | undefined
  if (!callbackQuery) {
    return jsonOk() // not a callback query, ignore silently
  }

  const from = callbackQuery.from as Record<string, unknown> | undefined
  const telegramUserId = String(from?.id ?? "")
  const callbackData = String(callbackQuery.data ?? "")
  const callbackQueryId = String(callbackQuery.id ?? "")

  // Verify user is allowed
  if (allowedIds.length > 0 && !allowedIds.includes(telegramUserId)) {
    console.warn(`[admin-callback] Unauthorized telegram user: ${telegramUserId}`)
    await answerCallbackQuery(callbackQueryId, "Nicht autorisiert")
    return jsonOk()
  }

  // Parse callback_data
  const match = callbackData.match(CALLBACK_RE)
  if (!match) {
    console.warn(`[admin-callback] Invalid callback_data format: ${callbackData}`)
    await answerCallbackQuery(callbackQueryId, "Ungültiges Format")
    return jsonOk()
  }

  const action = match[1] as "approve" | "reject" | "snooze"
  const actionId = match[2]

  // Fetch the SupervisorAction
  const supervisorAction = await prisma.supervisorAction.findUnique({
    where: { id: actionId },
  })

  if (!supervisorAction) {
    await answerCallbackQuery(callbackQueryId, "Aktion nicht gefunden")
    return jsonOk()
  }

  if (supervisorAction.status !== "PENDING_ADMIN") {
    await answerCallbackQuery(callbackQueryId, `Bereits ${supervisorAction.status}`)
    // Update message to show current status
    const msg = callbackQuery.message as Record<string, unknown> | undefined
    const chatId = msg?.chat ? String((msg.chat as Record<string, unknown>).id ?? "") : ""
    const msgId = Number((msg as Record<string, unknown> | undefined)?.message_id ?? 0)
    if (chatId && msgId) {
      const statusLabels: Record<string, string> = {
        APPROVED: "✅ Genehmigt",
        REJECTED: "❌ Abgelehnt",
        AUTO_APPROVED: "⚡ Auto-Genehmigt",
        EXECUTED: "✅ Ausgeführt",
        FAILED: "💥 Fehlgeschlagen",
        EXPIRED: "⏰ Abgelaufen",
      }
      const label = statusLabels[supervisorAction.status] ?? supervisorAction.status
      await editMessageText(chatId, msgId, `⚠️ Bereits bearbeitet: ${label}`)
    }
    return jsonOk()
  }

  const cqMsg = callbackQuery.message as Record<string, unknown> | undefined
  const chatId = cqMsg?.chat ? String((cqMsg.chat as Record<string, unknown>).id ?? "") : ""
  const msgId = Number((cqMsg as Record<string, unknown> | undefined)?.message_id ?? 0)

  // Find admin user by telegram chat id
  const adminUser = await prisma.user.findFirst({
    where: { adminTelegramChatId: chatId },
    select: { id: true },
  })

  switch (action) {
    case "approve": {
      await prisma.supervisorAction.update({
        where: { id: actionId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approverUserId: adminUser?.id ?? null,
        },
      })

      await enqueueJob({
        type: "supervisor_execute",
        payload: { supervisorActionId: actionId },
        boardId: supervisorAction.boardId,
        leadId: supervisorAction.leadId ?? undefined,
      })

      if (chatId && msgId) {
        await editMessageText(chatId, msgId, `✅ *Aktion genehmigt*\n\n${supervisorAction.proposedAction}\n\nWird ausgeführt…`)
      }

      await answerCallbackQuery(callbackQueryId, "✅ Genehmigt — wird ausgeführt")
      break
    }

    case "reject": {
      await prisma.supervisorAction.update({
        where: { id: actionId },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectReason: "Vom Admin abgelehnt (Telegram)",
          approverUserId: adminUser?.id ?? null,
        },
      })

      if (chatId && msgId) {
        await editMessageText(chatId, msgId, `❌ *Aktion abgelehnt*\n\n${supervisorAction.proposedAction}`)
      }

      await answerCallbackQuery(callbackQueryId, "❌ Abgelehnt")
      break
    }

    case "snooze": {
      const snoozedUntil = new Date(Date.now() + 3600000) // +1h
      const existingCtx = supervisorAction.triggerContext as Record<string, unknown>
      await prisma.supervisorAction.update({
        where: { id: actionId },
        data: {
          triggerContext: JSON.parse(JSON.stringify({ ...existingCtx, snoozedUntil: snoozedUntil.toISOString() })),
        },
      })

      if (chatId && msgId) {
        await editMessageText(
          chatId,
          msgId,
          `⏸ *Geschlummert*\n\n${supervisorAction.proposedAction}\n\nErinnerung: ${snoozedUntil.toLocaleString("de-DE")}`,
        )
      }

      await answerCallbackQuery(callbackQueryId, "⏸ Für 1h geschlummert")
      break
    }
  }

  return jsonOk()
}

// Allow GET for webhook setup/health check
export async function GET() {
  return NextResponse.json({ ok: true, message: "Admin callback endpoint ready" })
}
