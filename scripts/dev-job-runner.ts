#!/usr/bin/env tsx
/**
 * Local dev job runner — polls the job queue every 5 seconds.
 * Run with: npx tsx scripts/dev-job-runner.ts
 */

import { PrismaClient } from "@prisma/client"

const POLL_INTERVAL_MS = 5_000
const BATCH_SIZE = 10

// Inline minimal runner to avoid Next.js module resolution issues at CLI level
const prisma = new PrismaClient()

async function processNextBatch(): Promise<number> {
  const now = new Date()

  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "jobs"
    SET status = 'running', "startedAt" = NOW(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM "jobs"
      WHERE status = 'pending'
        AND "scheduledFor" <= ${now}
        AND attempts < "maxAttempts"
      ORDER BY "scheduledFor" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `

  if (claimed.length === 0) return 0

  let processed = 0
  for (const { id } of claimed) {
    const job = await prisma.job.findUnique({ where: { id } })
    if (!job) continue

    console.log(`[dev-runner] Processing job ${id} type=${job.type}`)
    try {
      // Trigger via local HTTP — avoids importing Next.js server modules
      const res = await fetch("http://localhost:3000/api/cron/process-jobs", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "dev"}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      processed++
    } catch (err) {
      console.error(`[dev-runner] Failed to trigger cron endpoint:`, err)
      // Re-queue the job
      await prisma.job.update({
        where: { id },
        data: {
          status: "pending",
          lastError: String(err).slice(0, 200),
        },
      })
    }
  }

  return processed
}

async function main() {
  console.log(`[dev-runner] Started — polling every ${POLL_INTERVAL_MS / 1000}s`)

  // Let the cron endpoint do the actual work per job; here we just trigger it on interval
  const trigger = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/cron/process-jobs", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "dev"}` },
      })
      const data = await res.json()
      if (data.processed > 0) console.log(`[dev-runner] Processed ${data.processed} jobs`)
    } catch {
      // Server not ready yet, ignore
    }
  }

  // Run immediately, then on interval
  await trigger()
  setInterval(trigger, POLL_INTERVAL_MS)
}

main().catch(console.error)
