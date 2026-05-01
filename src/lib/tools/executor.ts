import { prisma } from "@/lib/db"
import { getTool, type ToolExecutionContext, type ToolResult } from "./registry"
import type { ToolCall } from "@/lib/ai/providers/types"
import type { Conversation, Board, State } from "@prisma/client"

export interface ExecutedToolCall {
  tool_call_id: string
  toolName: string
  result: ToolResult
  resultText: string
}

export async function executeToolCalls(params: {
  toolCalls: ToolCall[]
  conversation: Conversation
  board: Board
  state: State & { availableTools?: unknown }
  context: ToolExecutionContext
}): Promise<ExecutedToolCall[]> {
  const { toolCalls, conversation, board, state, context } = params
  const allowedTools = (state.availableTools as string[] | null) ?? []
  const results: ExecutedToolCall[] = []

  for (const toolCall of toolCalls) {
    const start = Date.now()
    let result: ToolResult
    let error: string | undefined

    const tool = getTool(toolCall.name)

    if (!tool) {
      error = `Unbekanntes Tool: '${toolCall.name}'`
      result = { success: false, error }
    } else if (allowedTools.length > 0 && !allowedTools.includes(toolCall.name)) {
      error = `Tool '${toolCall.name}' ist für diesen State nicht erlaubt. Erlaubt: ${allowedTools.join(", ")}`
      result = { success: false, error }
    } else {
      try {
        result = await Promise.race([
          tool.execute({ args: toolCall.arguments, conversation, board, state: state as State, context }),
          new Promise<ToolResult>((_, reject) =>
            setTimeout(() => reject(new Error("Tool timeout nach 10s")), 10_000)
          ),
        ])
      } catch (err) {
        error = err instanceof Error ? err.message : "Tool-Ausführung fehlgeschlagen"
        result = { success: false, error }
      }
    }

    const durationMs = Date.now() - start

    // Log to DB (skip in simulate mode)
    if (!context.simulate) {
      await prisma.toolCallLog.create({
        data: {
          conversationId: conversation.id,
          stateId: context.stateId,
          toolName: toolCall.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputJson: toolCall.arguments as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outputJson: (result.data ?? null) as any,
          success: result.success,
          errorMessage: result.error ?? null,
          durationMs,
        },
      }).catch((e) => console.error("[ToolCallLog] Failed to write log:", e))
    }

    const resultText = result.success
      ? `OK: ${JSON.stringify(result.data ?? {})}`
      : `FEHLER: ${result.error}`

    results.push({
      tool_call_id: toolCall.id,
      toolName: toolCall.name,
      result,
      resultText,
    })
  }

  return results
}
