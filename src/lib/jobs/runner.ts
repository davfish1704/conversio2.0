import { prisma } from "@/lib/db"
import type { JobType, JobPayload } from "./enqueue"

const conversationLocks = new Map<string, Promise<void>>()

async function acquireConversationLock(
  conversationId: string | undefined,
  fn: () => Promise<void>,
): Promise<void> {
  if (!conversationId) {
    await fn()
    return
  }

  const prev = conversationLocks.get(conversationId) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  conversationLocks.set(conversationId, next)
  await next
}

export async function processNextBatch(limit = 10): Promise<number> {
  const now = new Date()

  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "jobs"
    SET status = 'RUNNING'::"JobStatus", "startedAt" = NOW(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM "jobs"
      WHERE status = 'PENDING'::"JobStatus"
        AND "scheduledFor" <= ${now}
        AND attempts < "maxAttempts"
      ORDER BY "scheduledFor" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `

  if (claimed.length === 0) return 0

  let processed = 0

  await Promise.all(
    claimed.map(async ({ id }) => {
      const job = await prisma.job.findUnique({ where: { id } })
      if (!job) return

      try {
        await executeJob(job.type as JobType, job.payload as JobPayload)
        await prisma.job.update({
          where: { id },
          data: { status: "COMPLETED", completedAt: new Date() },
        })
        processed++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        const willRetry = job.attempts < job.maxAttempts
        const backoffMs = 60 * 1000 * Math.pow(2, job.attempts)

        await prisma.job.update({
          where: { id },
          data: {
            status: willRetry ? "PENDING" : "DEAD",
            lastError: errorMsg.slice(0, 500),
            ...(willRetry ? { scheduledFor: new Date(Date.now() + backoffMs) } : {}),
          },
        })

        if (!willRetry) {
          prisma.failedJob
            .create({
              data: {
                jobId: id,
                type: job.type,
                payload: job.payload as Parameters<
                  typeof prisma.failedJob.create
                >[0]["data"]["payload"],
                lastError: errorMsg.slice(0, 500),
                attempts: job.attempts,
                boardId: job.boardId ?? null,
                leadId: job.leadId ?? null,
              },
            })
            .catch(() => {})

          import("@/lib/notifications/admin-notify")
            .then(({ notifyAdmin }) =>
              notifyAdmin({
                type: "FAILED_JOB",
                title: `Job failed: ${job.type}`,
                body: `Job ${id} failed after ${job.attempts} attempts: ${errorMsg.slice(0, 200)}`,
                jobId: id,
                boardId: job.boardId ?? undefined,
                leadId: job.leadId ?? undefined,
              }),
            )
            .catch(() => {})
        }

        console.error(
          `[JobRunner] job=${id} type=${job.type} attempt=${job.attempts} willRetry=${willRetry} error:`,
          errorMsg,
        )
      }
    }),
  )

  return processed
}

async function executeJob(type: JobType, payload: JobPayload): Promise<void> {
  switch (type) {
    case "process_message": {
      const convId = payload.conversationId
      if (!convId) throw new Error("Missing conversationId")
      await acquireConversationLock(convId, async () => {
        const { executeStateForConversation } = await import(
          "@/lib/state-machine/executor"
        )
        await executeStateForConversation(convId, payload.userMessage ?? "")
      })
      break
    }
    case "escalation_check": {
      if (!payload.conversationId) throw new Error("Missing conversationId")
      await handleEscalationCheck(payload.conversationId)
      break
    }
    case "summarize_conversation": {
      if (!payload.conversationId) throw new Error("Missing conversationId")
      const { summarizeConversation } = await import("@/lib/conversation-memory")
      await summarizeConversation(payload.conversationId)
      break
    }
    default:
      throw new Error(`Unknown job type: ${type}`)
  }
}

async function handleEscalationCheck(conversationId: string): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { currentState: true },
  })
  if (!conversation || !conversation.boardId) return

  const state = conversation.currentState
  if (!state) return

  const lastInbound = await prisma.message.findFirst({
    where: { conversationId, direction: "INBOUND" },
    orderBy: { timestamp: "desc" },
  })
  const lastOutbound = await prisma.message.findFirst({
    where: { conversationId, direction: "OUTBOUND", aiGenerated: true },
    orderBy: { timestamp: "desc" },
  })

  if (!lastOutbound) return
  if (lastInbound && lastInbound.timestamp > lastOutbound.timestamp) return

  const { createNotification } = await import("@/lib/notifications")
  await createNotification(
    conversation.boardId,
    conversationId,
    "no_reply",
    `No reply since ${(state as { escalateOnNoReply?: number }).escalateOnNoReply ?? "N/A"}h.`,
  )

  const newFollowupCount = (conversation.followupCount ?? 0) + 1
  const maxFollowups = (state as { maxFollowups?: number }).maxFollowups ?? 3
  const followupAction = (state as { followupAction?: string }).followupAction ?? "escalate"

  if (newFollowupCount >= maxFollowups) {
    if (followupAction === "escalate") {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          frozen: true,
          frozenReason: "followup_limit_reached",
          followupCount: newFollowupCount,
        },
      })
    } else if (followupAction === "advance_to_state") {
      const targetStateId = (state as { followupTargetState?: string | null })
        .followupTargetState
      if (targetStateId) {
        const { transitionState } = await import("@/lib/state-machine")
        await transitionState(conversationId, targetStateId, "ai_advance")
      }
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { followupCount: newFollowupCount },
      })
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "ARCHIVED", followupCount: newFollowupCount },
      })
    }
  } else {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { followupCount: newFollowupCount },
    })
  }
}
