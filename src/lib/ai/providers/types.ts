export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIResponse {
  content: string
  toolCalls: ToolCall[]
  finishReason: "stop" | "tool_calls" | "length" | "error"
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  model: string
  rawResponse?: unknown
}

export interface AIProvider {
  readonly name: string
  chat(params: {
    messages: AIMessage[]
    model: string
    tools?: ToolDefinition[]
    temperature?: number
    maxTokens?: number
  }): Promise<AIResponse>

  calculateCost(inputTokens: number, outputTokens: number, model: string): number
}

export class AIProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    public readonly cause: unknown
  ) {
    super(`AI provider '${provider}' unavailable: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = "AIProviderUnavailableError"
  }
}
