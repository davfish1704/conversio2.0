/**
 * Admin Telegram Bot Setup.
 *
 * Setzt adminTelegramChatId + isSuperAdmin auf einem User-Account,
 * registriert den Webhook bei Telegram und schickt eine Test-Nachricht.
 *
 * Verwendung:
 *   npx tsx scripts/setup-admin-telegram.ts --email <email> --chat-id <telegramChatId>
 *
 * Voraussetzungen:
 *   ADMIN_TELEGRAM_BOT_TOKEN  in .env gesetzt
 *   NEXTAUTH_URL              in .env gesetzt (z.B. https://conversio.vercel.app)
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const args = process.argv.slice(2)

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : undefined
}

const emailArg  = getArg("email")
const chatIdArg = getArg("chat-id")

if (!emailArg || !chatIdArg) {
  console.error("Verwendung: npx tsx scripts/setup-admin-telegram.ts --email <email> --chat-id <telegramChatId>")
  process.exit(1)
}

const BOT_TOKEN  = process.env.ADMIN_TELEGRAM_BOT_TOKEN
const NEXTAUTH_URL = process.env.NEXTAUTH_URL

if (!BOT_TOKEN) {
  console.error("❌ ADMIN_TELEGRAM_BOT_TOKEN nicht gesetzt")
  process.exit(1)
}
if (!NEXTAUTH_URL) {
  console.error("❌ NEXTAUTH_URL nicht gesetzt")
  process.exit(1)
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

async function telegramPost(method: string, body: object): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${API_BASE}/${method}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
  return res.json()
}

async function main() {
  console.log("\n🤖 Admin Telegram Bot Setup\n")

  // ── Step 1: User finden + updaten ─────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where:  { email: emailArg!.toLowerCase().trim() },
    select: { id: true, email: true, isSuperAdmin: true },
  })

  if (!user) {
    console.error(`❌ User nicht gefunden: ${emailArg}`)
    process.exit(1)
  }

  await prisma.user.update({
    where: { id: user.id },
    data:  {
      adminTelegramChatId: chatIdArg!.trim(),
      isSuperAdmin:        true,
      adminChannel:        "TELEGRAM",
    },
  })

  console.log(`✅ User ${user.email} → adminTelegramChatId: ${chatIdArg}, isSuperAdmin: true`)

  // ── Step 2: Webhook registrieren ──────────────────────────────────────────
  const webhookUrl = `${NEXTAUTH_URL}/api/admin/telegram/webhook`
  const webhookSecret = process.env.ADMIN_TELEGRAM_WEBHOOK_SECRET ?? ""

  const setWebhookResult = await telegramPost("setWebhook", {
    url:          webhookUrl,
    secret_token: webhookSecret || undefined,
    allowed_updates: ["message", "callback_query"],
  })

  if (!setWebhookResult.ok) {
    console.error(`❌ setWebhook fehlgeschlagen: ${setWebhookResult.description}`)
    process.exit(1)
  }

  console.log(`✅ Webhook registriert: ${webhookUrl}`)

  // ── Step 3: Test-Nachricht ─────────────────────────────────────────────────
  const testResult = await telegramPost("sendMessage", {
    chat_id:    chatIdArg!.trim(),
    text:       "✅ *Admin Bot verbunden*\n\nSupervisor-Benachrichtigungen werden ab sofort hier empfangen.\n\n/help für verfügbare Befehle.",
    parse_mode: "Markdown",
  })

  if (!testResult.ok) {
    console.error(`❌ Test-Nachricht fehlgeschlagen: ${testResult.description}`)
    console.error("   Ist die Chat-ID korrekt? Hast du den Bot gestartet (/start)?")
    process.exit(1)
  }

  console.log("✅ Test-Nachricht gesendet")
  console.log("\nAdmin Telegram Bot ist einsatzbereit.\n")
}

main()
  .catch((err) => {
    console.error("\n❌ Fehler:", err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
