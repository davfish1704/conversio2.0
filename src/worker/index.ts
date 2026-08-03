// Persistent worker process for VPS/Coolify deployment — replaces Vercel Cron
// (vercel.json's "crons" entries) after the Vercel cutover.
//
// This process polls the job queue (src/lib/jobs/runner.ts) and runs the
// Supervisor timers directly in-process instead of via HTTP cron routes.
//
// SINGLE-PROCESS ONLY. The conversation lock used inside processNextBatch()
// (acquireConversationLock in src/lib/jobs/runner.ts) is a plain in-memory
// Map, scoped to this process — it is NOT shared/distributed across
// processes or instances. Running more than one instance of this worker at
// the same time (or scaling it to >1 replica) allows two instances to run
// executeStateForConversation() for the same conversation concurrently,
// which the lock cannot prevent across process boundaries. Deploy this as
// exactly one Coolify resource, replicas = 1, no horizontal scaling.

import { createServer } from "node:http"
import { processNextBatch } from "@/lib/jobs/runner"
import { runSupervisorScan } from "@/lib/supervisor/supervisor-scan"
import { runPeriodicAudit } from "@/lib/supervisor/triggers/periodic"
import { checkStuckLeads } from "@/lib/jobs/check-stuck-leads"
import { prisma } from "@/lib/db"

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 3000)
const SUPERVISOR_SCAN_MS = Number(process.env.WORKER_SUPERVISOR_SCAN_MS ?? 5 * 60 * 1000)
const SUPERVISOR_AUDIT_MS = Number(process.env.WORKER_SUPERVISOR_AUDIT_MS ?? 4 * 60 * 60 * 1000)
const STUCK_LEADS_MS = Number(process.env.WORKER_STUCK_LEADS_MS ?? 10 * 60 * 1000)
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3001)

let shuttingDown = false

// Process-wide safety net. Several code paths reachable from this worker are
// fire-and-forget (e.g. the AgentRun write in sub-agent-runtime.ts:668-696 and
// the reactive-supervisor trigger at sub-agent-runtime.ts:754-765 are both
// intentionally not awaited by design). A rejection from one of those happens
// OUTSIDE any tick's try/catch in scheduleInterval below, so it would
// otherwise surface here as an unhandledRejection and silently kill the
// process with no restart. Exiting loudly instead lets Coolify's restart
// policy (always) bring the process back up cleanly.
process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandledRejection — exiting so Coolify restarts:", reason)
  process.exit(1)
})
process.on("uncaughtException", (err) => {
  console.error("[worker] uncaughtException — exiting so Coolify restarts:", err)
  process.exit(1)
})

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "unknown"
  } catch {
    return "unknown"
  }
}

type Timer = {
  name: string
  intervalMs: number
  running: boolean
  currentRun: Promise<void> | null
  handle: NodeJS.Timeout
  lastTickStartedAt: number | null
}

const timers: Timer[] = []

// Runs `fn` on a fixed interval. Re-entrancy-safe: if a tick is still running
// when the next one is due, the next tick is skipped entirely (never queued,
// never run in parallel with itself). Per-tick errors are caught and logged —
// they never crash the process, the next tick always still runs.
// `immediate` (default false) fires one tick right at scheduling time instead
// of waiting a full intervalMs first — only used for the job-runner poll, so
// a restart doesn't delay picking the queue back up; the longer-interval
// Supervisor timers deliberately wait one full interval before their first
// run so a process restart doesn't re-trigger them early.
function scheduleInterval(
  name: string,
  intervalMs: number,
  fn: () => Promise<unknown>,
  immediate = false
): Timer {
  const timer: Timer = {
    name,
    intervalMs,
    running: false,
    currentRun: null,
    handle: null as unknown as NodeJS.Timeout,
    lastTickStartedAt: null,
  }

  const tick = () => {
    if (shuttingDown) return
    if (timer.running) {
      console.log(`[worker:${name}] skip tick — previous run still in progress`)
      return
    }
    timer.running = true
    timer.lastTickStartedAt = Date.now()
    timer.currentRun = fn()
      .then(() => undefined)
      .catch((err) => {
        console.error(`[worker:${name}] tick failed:`, err)
      })
      .finally(() => {
        timer.running = false
        timer.currentRun = null
      })
  }

  timer.handle = setInterval(tick, intervalMs)
  if (immediate) tick()
  timers.push(timer)
  return timer
}

// Minimal health endpoint — no framework, plain node:http. Only GET /healthz.
// Purpose: make "process is alive but has stopped processing" visible (e.g.
// the job-runner tick is wedged), not just "process didn't crash".
const healthServer = createServer((req, res) => {
  if (req.method !== "GET" || req.url !== "/healthz") {
    res.writeHead(404).end()
    return
  }

  const jobRunnerTimer = timers.find((t) => t.name === "job-runner")
  const lastJobTickAt = jobRunnerTimer?.lastTickStartedAt ?? null
  const staleThresholdMs = Math.max(3 * POLL_MS, 30_000)
  const isStale = lastJobTickAt === null || Date.now() - lastJobTickAt > staleThresholdMs

  const body = JSON.stringify({
    pid: process.pid,
    uptimeSec: Math.round(process.uptime()),
    pollMs: POLL_MS,
    lastJobTickAt: lastJobTickAt !== null ? new Date(lastJobTickAt).toISOString() : null,
    secondsSinceLastJobTick:
      lastJobTickAt !== null ? Math.round((Date.now() - lastJobTickAt) / 1000) : null,
  })

  res.writeHead(isStale ? 503 : 200, { "Content-Type": "application/json" }).end(body)
})

async function main() {
  console.log(
    `[worker] starting — pollMs=${POLL_MS} dbHost=${dbHost()} pid=${process.pid}`
  )

  scheduleInterval("job-runner", POLL_MS, () => processNextBatch(20), true)
  scheduleInterval("supervisor-scan", SUPERVISOR_SCAN_MS, () => runSupervisorScan())
  scheduleInterval("supervisor-audit", SUPERVISOR_AUDIT_MS, () => runPeriodicAudit())
  scheduleInterval("check-stuck-leads", STUCK_LEADS_MS, () => checkStuckLeads())

  healthServer.on("error", (err) => {
    console.error("[worker] health server error:", err)
  })
  healthServer.listen(HEALTH_PORT, () => {
    console.log(`[worker] health endpoint listening on :${HEALTH_PORT}/healthz`)
  })

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[worker] received ${signal}, stopping new ticks, waiting for in-flight work...`)

    for (const timer of timers) {
      clearInterval(timer.handle)
    }

    const hardExit = setTimeout(() => {
      console.error("[worker] shutdown timed out after 10s, forcing exit")
      process.exit(1)
    }, 10_000)

    await Promise.allSettled(timers.map((t) => t.currentRun ?? Promise.resolve()))
    clearTimeout(hardExit)

    healthServer.close()
    await prisma.$disconnect().catch(() => {})

    console.log("[worker] shutdown complete")
    process.exit(0)
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"))
  process.on("SIGINT", () => void shutdown("SIGINT"))
}

main()
