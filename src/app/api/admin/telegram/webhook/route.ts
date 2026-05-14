import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { enqueueJob } from "@/lib/jobs/enqueue"
import { renderActionExecuted } from "@/lib/admin-notifier/templates/action-executed"
import { updateNotificationMessage } from "@/lib/admin-notifier/admin-notifier"
import type { ApprovalStatus } from "@prisma/client"

const WEBHOOK_SECRET = () => process.env.ADMIN_TELEGRAM_WEBHOOK_SECRET ?? ""
const BOT_TOKEN      = () => process.env.ADMIN_TELEGRAM_BOT_TOKEN ?? ""
const API_BASE       = () => `https://api.telegram.org/bot${BOT_TOKEN()}`

// Always 200 — Telegram retries on any non-200
const OK = NextResponse.json({ ok: true })

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 })
}

export async function POST(req: NextRequest) {
  // Verify secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token")
  if (WEBHOOK_SECRET() && secret !== WEBHOOK_SECRET()) {
    console.warn("[admin-telegram-webhook] Invalid secret, dropping")
    return OK
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return OK
  }

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query).catch((e) =>
      console.error("[admin-telegram-webhook] callback error:", e),
    )
  } else if (update.message?.text?.startsWith("/")) {
    await handleSlashCommand(update.message).catch((e) =>
      console.error("[admin-telegram-webhook] command error:", e),
    )
  }

  return OK
}

// ── Inline Button Callback ─────────────────────────────────────────────────────

async function handleCallbackQuery(cb: TelegramCallbackQuery) {
  const chatId = String(cb.from.id)

  const user = await prisma.user.findFirst({
    where: { adminTelegramChatId: chatId, isSuperAdmin: true },
    select: { id: true },
  })

  if (!user) {
    await answerCallbackQuery(cb.id, "⛔ Nicht autorisiert")
    return
  }

  const [cbAction, actionId] = (cb.data ?? "").split(":")
  if (!actionId || (cbAction !== "approve" && cbAction !== "reject")) {
    await answerCallbackQuery(cb.id, "Unbekannte Aktion")
    return
  }

  const action = await prisma.supervisorAction.findUnique({ where: { id: actionId } })
  if (!action) {
    await answerCallbackQuery(cb.id, "Aktion nicht gefunden")
    return
  }
  if (action.status !== "PENDING_ADMIN") {
    await answerCallbackQuery(cb.id, "Bereits verarbeitet")
    return
  }

  if (cbAction === "approve") {
    const updated = await prisma.supervisorAction.update({
      where: { id: actionId },
      data: {
        status:        "APPROVED",
        approverUserId: user.id,
        approvedAt:    new Date(),
      },
    })

    await enqueueJob({
      type:    "supervisor_execute",
      payload: { supervisorActionId: actionId },
      boardId: action.boardId,
    })

    if (action.notificationMessageId && action.notificationChannel) {
      await updateNotificationMessage(
        action.notificationMessageId,
        action.notificationChannel,
        renderActionExecuted({ ...updated, status: "APPROVED" as ApprovalStatus }),
        true,
      )
    }

    await answerCallbackQuery(cb.id, "✅ Genehmigt")
  } else {
    const updated = await prisma.supervisorAction.update({
      where: { id: actionId },
      data: {
        status:        "REJECTED",
        rejectReason:  "admin_rejected",
        rejectedAt:    new Date(),
        approverUserId: user.id,
      },
    })

    if (action.notificationMessageId && action.notificationChannel) {
      await updateNotificationMessage(
        action.notificationMessageId,
        action.notificationChannel,
        renderActionExecuted({ ...updated, status: "REJECTED" as ApprovalStatus }),
        true,
      )
    }

    await answerCallbackQuery(cb.id, "❌ Abgelehnt")
  }
}

// ── Slash Commands ─────────────────────────────────────────────────────────────

async function handleSlashCommand(msg: TelegramMessage) {
  const chatId = String(msg.chat.id)
  const text   = msg.text ?? ""

  const user = await prisma.user.findFirst({
    where: { adminTelegramChatId: chatId, isSuperAdmin: true },
    select: { id: true },
  })

  if (!user) {
    await sendMessage(chatId, "⛔ Nicht autorisiert.")
    return
  }

  const [command, ...argParts] = text.trim().split(/\s+/)

  switch (command) {
    case "/help":
      await sendMessage(chatId, [
        "*Supervisor Admin Bot — Befehle*",
        "",
        "/pending — Offene Genehmigungen",
        "/status  — Statistiken der letzten 24h",
        "/pause lead=<leadId>  — Lead pausieren",
        "/resume lead=<leadId> — Lead fortsetzen",
        "/help    — Diese Hilfe",
      ].join("\n"))
      break

    case "/pending":
      await handlePending(chatId)
      break

    case "/status":
      await handleStatus(chatId)
      break

    case "/pause":
    case "/resume": {
      const leadArg = argParts.find((a) => a.startsWith("lead="))?.split("=")[1]
      if (!leadArg) {
        await sendMessage(chatId, `Verwendung: ${command} lead=<leadId>`)
        break
      }
      const frozen = command === "/pause"
      const lead = await prisma.lead.findUnique({ where: { id: leadArg }, select: { id: true } })
      if (!lead) {
        await sendMessage(chatId, `Lead nicht gefunden: ${leadArg}`)
        break
      }
      await prisma.conversation.updateMany({
        where:  { leadId: leadArg, status: "ACTIVE" },
        data:   { frozen, frozenReason: frozen ? "admin_pause" : null },
      })
      await sendMessage(chatId, `${frozen ? "⏸" : "▶️"} Lead ${leadArg} ${frozen ? "pausiert" : "fortgesetzt"}.`)
      break
    }

    default:
      await sendMessage(chatId, "Unbekannter Befehl. /help für eine Übersicht.")
  }
}

async function handlePending(chatId: string) {
  const actions = await prisma.supervisorAction.findMany({
    where:   { status: "PENDING_ADMIN" },
    orderBy: { createdAt: "asc" },
    take:    10,
    select:  { id: true, proposedAction: true, urgency: true, boardId: true, createdAt: true },
  })

  if (actions.length === 0) {
    await sendMessage(chatId, "✅ Keine offenen Genehmigungen.")
    return
  }

  const lines = actions.map((a, i) =>
    `${i + 1}. *${a.proposedAction}* (${a.urgency}) — Board: \`${a.boardId.slice(0, 8)}\`\nID: \`${a.id}\``,
  )
  await sendMessage(chatId, `*Offene Genehmigungen (${actions.length})*\n\n${lines.join("\n\n")}`)
}

async function handleStatus(chatId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [total, failed, blocked, escalated, pending] = await Promise.all([
    prisma.agentRun.count({ where: { createdAt: { gte: since } } }),
    prisma.agentRun.count({ where: { createdAt: { gte: since }, outcome: { in: ["LLM_ERROR", "TOOL_EXECUTION_FAILED"] } } }),
    prisma.agentRun.count({ where: { createdAt: { gte: since }, outcome: "HANDOFF_BLOCKED" } }),
    prisma.agentRun.count({ where: { createdAt: { gte: since }, outcome: "ESCALATED" } }),
    prisma.supervisorAction.count({ where: { status: "PENDING_ADMIN" } }),
  ])

  const health = failed === 0 && escalated === 0 ? "✅" : "⚠️"
  await sendMessage(chatId, [
    `${health} *Status — letzte 24h*`,
    "",
    `Agent-Runs:         ${total}`,
    `Fehlgeschlagen:     ${failed}`,
    `Handoffs blockiert: ${blocked}`,
    `Eskalationen:       ${escalated}`,
    `Offene Aktionen:    ${pending}`,
  ].join("\n"))
}

// ── Telegram API Helpers ───────────────────────────────────────────────────────

async function telegramPost(method: string, body: object) {
  return fetch(`${API_BASE()}/${method}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

async function sendMessage(chatId: string, text: string) {
  await telegramPost("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" })
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await telegramPost("answerCallbackQuery", { callback_query_id: callbackQueryId, text })
}

// ── Telegram Types (minimal) ───────────────────────────────────────────────────

interface TelegramUpdate {
  callback_query?: TelegramCallbackQuery
  message?:        TelegramMessage
}

interface TelegramCallbackQuery {
  id:   string
  from: { id: number }
  data?: string
  message?: TelegramMessage
}

interface TelegramMessage {
  chat: { id: number }
  from?: { id: number }
  text?: string
  message_id: number
}
