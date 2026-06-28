import { prisma } from "@/lib/db"

export type JobType = "process_message" | "escalation_check" | "summarize_conversation" | "supervisor_execute"

export interface JobPayload {
  conversationId?: string
  boardId?: string
  userMessage?: string
  [key: string]: unknown
}

// Collapse rapid-fire messages from the same conversation into a single agent
// run. Configurable via MESSAGE_DEBOUNCE_MS; defaults to 8 seconds.
const DEBOUNCE_MS = Number(process.env.MESSAGE_DEBOUNCE_MS ?? 8_000)

export async function enqueueJob(params: {
  type: JobType
  payload: JobPayload
  scheduledFor?: Date
  leadId?: string
  boardId?: string
  maxAttempts?: number
}) {
  if (params.type === "process_message" && params.payload.conversationId) {
    return enqueueMessageDebounced({
      type: "process_message",
      payload: params.payload as JobPayload & { conversationId: string },
      leadId: params.leadId,
      boardId: params.boardId,
      maxAttempts: params.maxAttempts,
    })
  }

  return prisma.job.create({
    data: {
      type: params.type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: params.payload as any,
      scheduledFor: params.scheduledFor ?? new Date(),
      leadId: params.leadId,
      boardId: params.boardId,
      maxAttempts: params.maxAttempts ?? 3,
    },
  })
}

// Replace-debounce for process_message jobs.
//
// Within a single DB transaction:
//   1. Cancel every PENDING process_message job for this conversationId.
//      RUNNING jobs are left untouched — if one is mid-flight, the new PENDING
//      job handles messages that arrived while the previous run was executing.
//   2. Insert a new PENDING job with scheduledFor = now + DEBOUNCE_MS.
//
// The transaction serialises concurrent webhook calls: if two webhooks land
// simultaneously, one wins the UPDATE and the other's newly created job is
// immediately cancelled by the winning transaction's successor call. The net
// result is always exactly one PENDING job per conversation at any moment.
async function enqueueMessageDebounced(params: {
  type: "process_message"
  payload: JobPayload & { conversationId: string }
  leadId?: string
  boardId?: string
  maxAttempts?: number
}) {
  const { conversationId } = params.payload
  const scheduledFor = new Date(Date.now() + DEBOUNCE_MS)

  return prisma.$transaction(async (tx) => {
    // Cancel existing PENDING jobs for this conversation.
    // The status = 'PENDING' guard in WHERE ensures RUNNING jobs are untouched.
    await tx.job.updateMany({
      where: {
        type: "process_message",
        status: "PENDING",
        payload: { path: ["conversationId"], equals: conversationId },
      },
      data: { status: "CANCELLED" },
    })

    return tx.job.create({
      data: {
        type: params.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload: params.payload as any,
        scheduledFor,
        leadId: params.leadId,
        boardId: params.boardId,
        maxAttempts: params.maxAttempts ?? 3,
      },
    })
  })
}
