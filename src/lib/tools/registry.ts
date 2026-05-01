import type { Conversation, Board, State } from "@prisma/client"
import type { ToolDefinition } from "@/lib/ai/providers/types"

export interface ToolExecutionContext {
  conversationId: string
  boardId: string
  stateId: string
  simulate: boolean
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  nextAction?: "continue" | "wait" | "escalate" | "end"
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  isStub?: boolean
  requiresApproval?: boolean
  execute(params: {
    args: Record<string, unknown>
    conversation: Conversation
    board: Board
    state: State
    context: ToolExecutionContext
  }): Promise<ToolResult>
}

const registry = new Map<string, Tool>()

export function registerTool(tool: Tool): void {
  registry.set(tool.name, tool)
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name)
}

export function getAllTools(): Tool[] {
  return Array.from(registry.values())
}

export function getToolDefinitions(names: string[]): ToolDefinition[] {
  return names
    .map((n) => registry.get(n))
    .filter((t): t is Tool => t !== undefined)
    .map((t) => ({
      name: t.name,
      description: t.isStub
        ? `${t.description} [Noch nicht aktiviert]`
        : t.description,
      parameters: t.parameters,
    }))
}
