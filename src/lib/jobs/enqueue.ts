import { prisma } from "@/lib/db"

export type JobType = "process_message" | "escalation_check" | "summarize_conversation"

export interface JobPayload {
  conversationId?: string
  boardId?: string
  userMessage?: string
  [key: string]: unknown
}

export async function enqueueJob(params: {
  type: JobType
  payload: JobPayload
  scheduledFor?: Date
  leadId?: string
  boardId?: string
  maxAttempts?: number
}) {
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
