import { prisma } from "@/lib/db"

export interface ExecutionRecord {
  conversationId: string
  stateId: string
  stateName: string
  boardId: string
  channel: string

  model: string
  provider: string

  systemPrompt: string
  userMessage: string
  toolDefinitions: unknown[]

  structuredMemory: unknown
  transitionDecisions: unknown[]

  rawAIResponse: string
  parsedAIResponse: unknown
  sanitizedResponse: string | null

  toolCalls: unknown[]
  toolResults: unknown[]

  tokenUsage: { input: number; output: number; total: number }
  executionDurationMs: number
  retryCount: number
  errors: string[]
}

const executionLogs: ExecutionRecord[] = []

export function recordExecution(data: Omit<ExecutionRecord, "executionDurationMs"> & { startTime: number }): void {
  const record: ExecutionRecord = {
    ...data,
    executionDurationMs: Date.now() - data.startTime,
  }
  executionLogs.push(record)

  if (executionLogs.length > 1000) {
    executionLogs.shift()
  }

  prisma.executionLog.create({
    data: {
      boardId: data.boardId,
      conversationId: data.conversationId,
      stateId: data.stateId,
      action: "EXECUTION",
      input: JSON.stringify({
        userMessage: data.userMessage.slice(0, 500),
        systemPrompt: data.systemPrompt.slice(0, 200),
        toolCount: data.toolDefinitions.length,
      }),
      output: JSON.stringify({
        finishReason: data.parsedAIResponse,
        sanitizedLength: data.sanitizedResponse?.length ?? 0,
        tools: data.toolCalls.length,
        duration: Date.now() - data.startTime,
      }),
      status: data.errors.length > 0 ? "ERROR" : "SUCCESS",
      errorMessage: data.errors.length > 0 ? data.errors.join("; ").slice(0, 500) : null,
    },
  }).catch(() => {})
}

export function getRecentExecutions(count: number = 10): ExecutionRecord[] {
  return executionLogs.slice(-count)
}

export function getExecutionHistory(conversationId: string): ExecutionRecord[] {
  return executionLogs.filter((e) => e.conversationId === conversationId)
}

export function getDebugContext(conversationId: string): string {
  const records = getExecutionHistory(conversationId)
  if (records.length === 0) return "No execution records found."

  return records
    .map(
      (r, i) => `
=== Execution ${i + 1} ===
State: ${r.stateName} (${r.stateId})
Model: ${r.provider}/${r.model}
Duration: ${r.executionDurationMs}ms
User: ${r.userMessage.slice(0, 200)}
System Prompt (start): ${r.systemPrompt.slice(0, 300)}...
Raw AI: ${r.rawAIResponse.slice(0, 300)}...
Sanitized: ${r.sanitizedResponse?.slice(0, 200) ?? "(none)"}
Tools: ${r.toolCalls.map((t: any) => t.name).join(", ") || "none"}
Errors: ${r.errors.join(", ") || "none"}
---`,
    )
    .join("\n")
}
