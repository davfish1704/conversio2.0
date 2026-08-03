/**
 * Post-Deploy Smoke-Test. Läuft in der Shell nach jedem Deploy, nicht als
 * Teil einer Claude-Session.
 *
 * Ausführen:
 *   npx tsx scripts/smoke.ts
 *
 * Exit-Code 0, wenn alle Pflicht-Checks PASS. Exit-Code 1, sobald mindestens
 * einer FAIL meldet. Check 7 (AgentRun 24h) ist reines INFO und zählt nie
 * als FAIL. Idempotent: jeder Check räumt seine eigenen Testdaten in einem
 * finally-Block auf, unabhängig vom Ergebnis. Es werden nie ENV-Werte,
 * Secrets oder Connection-Strings ausgegeben — nur abgeleitete, unkritische
 * Informationen (Host, Version, Zähler, Booleans).
 */

import { execSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"
import { uploadToR2, deleteFromR2 } from "@/lib/r2"

type Status = "PASS" | "FAIL" | "INFO"
type Result = { name: string; status: Status; reason: string }

const results: Result[] = []

function record(name: string, status: Status, reason: string) {
  results.push({ name, status, reason })
  console.log(`[${status}] ${name} — ${reason}`)
}

// Liste aus dem ENV-Audit (docs/status/2026-07-27-conversio-status.md-Vorlage):
// nur Variablen ohne Fallback im Code ("zwingend").
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "R2_ACCESS_KEY_ID",
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  "R2_SECRET_ACCESS_KEY",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
]

async function checkEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length === 0) {
    record(
      "1. ENV-Variablen",
      "PASS",
      `alle ${REQUIRED_ENV_VARS.length} zwingenden Variablen gesetzt`
    )
  } else {
    record(
      "1. ENV-Variablen",
      "FAIL",
      `fehlend: ${missing.join(", ")}`
    )
  }
}

async function checkDbConnection() {
  try {
    const host = new URL(process.env.DATABASE_URL ?? "").host || "unbekannt"
    const rows = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`
    const version = rows[0]?.version?.split(",")[0] ?? "unbekannt"
    record("2. DB-Verbindung", "PASS", `host=${host} version="${version}"`)
  } catch (err) {
    record("2. DB-Verbindung", "FAIL", errMsg(err))
  }
}

async function checkPgVectorExtension() {
  try {
    const rows = await prisma.$queryRaw<Array<{ extversion: string }>>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `
    if (rows.length > 0) {
      record("3. pgvector Extension", "PASS", `installiert, version=${rows[0].extversion}`)
    } else {
      record("3. pgvector Extension", "FAIL", "Extension 'vector' nicht installiert")
    }
  } catch (err) {
    record("3. pgvector Extension", "FAIL", errMsg(err))
  }
}

async function checkMigrateStatus() {
  try {
    const output = execSync("npx prisma migrate status", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    if (output.includes("Database schema is up to date")) {
      record("4. Migrate Status", "PASS", "keine ausstehenden Migrationen")
    } else {
      const lastLine = output.trim().split("\n").filter(Boolean).pop() ?? "unbekannter Status"
      record("4. Migrate Status", "FAIL", lastLine)
    }
  } catch (err) {
    const output = (err as { stdout?: string })?.stdout ?? errMsg(err)
    const lastLine = output.trim().split("\n").filter(Boolean).pop() ?? errMsg(err)
    record("4. Migrate Status", "FAIL", lastLine)
  }
}

async function checkR2RoundTrip() {
  const key = `_smoke-test/${randomUUID()}.txt`
  const content = `smoke-test ${new Date().toISOString()}`
  let uploaded = false

  try {
    const publicUrl = process.env.R2_PUBLIC_URL
    if (!publicUrl) {
      record("5. R2 Round-Trip", "FAIL", "R2_PUBLIC_URL nicht gesetzt")
      return
    }

    // HEAD auf die Basis-URL — prüft nur Erreichbarkeit (DNS/TLS/Netzwerk),
    // nicht den HTTP-Status, da eine bloße HEAD auf den Bucket-Root je nach
    // R2-Konfiguration 4xx zurückgeben kann und trotzdem "erreichbar" ist.
    await fetch(publicUrl, { method: "HEAD" })

    const objectUrl = await uploadToR2(key, Buffer.from(content, "utf8"), "text/plain")
    uploaded = true

    const readRes = await fetch(objectUrl)
    if (!readRes.ok) {
      record("5. R2 Round-Trip", "FAIL", `Lesen über öffentliche URL fehlgeschlagen: HTTP ${readRes.status}`)
      return
    }
    const readBack = await readRes.text()
    if (readBack !== content) {
      record("5. R2 Round-Trip", "FAIL", "gelesener Inhalt weicht vom hochgeladenen Inhalt ab")
      return
    }

    record("5. R2 Round-Trip", "PASS", "HEAD erreichbar, Upload + Lesen über öffentliche URL erfolgreich")
  } catch (err) {
    record("5. R2 Round-Trip", "FAIL", errMsg(err))
  } finally {
    if (uploaded) {
      await deleteFromR2(key).catch(() => {})
    }
  }
}

async function checkQueueRoundTrip() {
  // Bewusst ein nicht erkannter Job-Type ("__smoke_test__"): executeJob()'s
  // default-Fall wirft sofort einen Fehler, ohne Conversation-/Lead-/
  // AgentRun-Tabellen anzufassen und ohne notifyAdmin/FailedJob auszulösen
  // (das passiert erst, wenn maxAttempts erschöpft ist — hier reicht ein
  // einzelner Claim-Versuch). Der Claim selbst inkrementiert "attempts" und
  // setzt "startedAt", bevor der Fehler geworfen wird — das ist das stabile,
  // beobachtbare Signal, dass der Worker die Zeile angefasst hat.
  let jobId: string | null = null
  try {
    const job = await prisma.job.create({
      data: {
        type: "__smoke_test__",
        payload: {},
        scheduledFor: new Date(),
      },
    })
    jobId = job.id

    const deadline = Date.now() + 15_000
    let picked = false
    while (Date.now() < deadline) {
      const current = await prisma.job.findUnique({ where: { id: job.id } })
      if (!current) break
      if (current.attempts > 0 || current.startedAt !== null) {
        picked = true
        break
      }
      await new Promise((r) => setTimeout(r, 1000))
    }

    if (picked) {
      record("6. Queue Round-Trip", "PASS", "Worker hat Test-Job innerhalb von 15s aufgenommen")
    } else {
      record("6. Queue Round-Trip", "FAIL", "Test-Job wurde nicht innerhalb von 15s vom Worker aufgenommen")
    }
  } catch (err) {
    record("6. Queue Round-Trip", "FAIL", errMsg(err))
  } finally {
    if (jobId) {
      await prisma.job.delete({ where: { id: jobId } }).catch(() => {})
    }
  }
}

async function checkRecentAgentRun() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const count = await prisma.agentRun.count({ where: { createdAt: { gte: since } } })
    record("7. AgentRun (24h)", "INFO", `${count} Run(s) in den letzten 24h`)
  } catch (err) {
    record("7. AgentRun (24h)", "INFO", `nicht ermittelbar: ${errMsg(err)}`)
  }
}

function errMsg(err: unknown): string {
  if (!(err instanceof Error)) return String(err)
  const cause = (err as { cause?: unknown }).cause
  const causeMsg = cause instanceof Error ? cause.message : cause ? String(cause) : null
  const base = err.message.split("\n")[0]
  return causeMsg ? `${base} (${causeMsg})` : base
}

async function main() {
  console.log("=== Post-Deploy Smoke-Test ===\n")

  await checkEnvVars()
  await checkDbConnection()
  await checkPgVectorExtension()
  await checkMigrateStatus()
  await checkR2RoundTrip()
  await checkQueueRoundTrip()
  await checkRecentAgentRun()

  const failed = results.filter((r) => r.status === "FAIL")
  const passed = results.filter((r) => r.status === "PASS")

  console.log(`\n=== Zusammenfassung: ${passed.length} PASS, ${failed.length} FAIL ===`)
  if (failed.length > 0) {
    for (const f of failed) console.log(`  ✗ ${f.name}: ${f.reason}`)
  }

  await prisma.$disconnect()
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch(async (err) => {
  console.error("[smoke] Kritischer Fehler:", errMsg(err))
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
