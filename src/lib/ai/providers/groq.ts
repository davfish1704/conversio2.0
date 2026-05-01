import OpenAI from "openai"
import type { AIMessage, AIProvider, AIResponse, ToolDefinition, ToolCall } from "./types"

// Q1 2026 prices per million tokens (input/output cents)
const GROQ_PRICING: Record<string, [number, number]> = {
  "llama-3.3-70b-versatile": [5.9, 7.9],
  "llama-3.1-70b-versatile": [5.9, 7.9],
  "llama-3.1-8b-instant": [0.5, 0.8],
  "llama-3.2-3b-preview": [0.6, 0.6],
  "gemma2-9b-it": [0.2, 0.2],
  "mixtral-8x7b-32768": [2.4, 2.4],
}

export class GroqProvider implements AIProvider {
  readonly name = "groq"
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    })
  }

  async chat(params: {
    messages: AIMessage[]
    model: string
    tools?: ToolDefinition[]
    temperature?: number
    maxTokens?: number
  }): Promise<AIResponse> {
    const openaiMessages = params.messages.map(toOpenAIMessage)
    const openaiTools = params.tools?.map(toOpenAITool)

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: openaiMessages as OpenAI.Chat.ChatCompletionMessageParam[],
      ...(openaiTools?.length ? { tools: openaiTools, tool_choice: "auto" } : {}),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1000,
    })

    const choice = response.choices[0]
    return {
      content: choice.message.content ?? "",
      toolCalls: parseToolCalls(choice.message.tool_calls),
      finishReason: mapFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      model: response.model,
    }
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const [inCpm, outCpm] = GROQ_PRICING[model] ?? [5.9, 7.9]
    return (inputTokens * inCpm + outputTokens * outCpm) / 1_000_000
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toOpenAIMessage(m: AIMessage): OpenAI.Chat.ChatCompletionMessageParam {
  if (m.role === "tool") {
    return { role: "tool", tool_call_id: m.tool_call_id!, content: m.content }
  }
  if (m.role === "assistant" && m.tool_calls?.length) {
    return {
      role: "assistant",
      content: m.content || null,
      tool_calls: m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
      })),
    }
  }
  return { role: m.role as "system" | "user" | "assistant", content: m.content }
}

function toOpenAITool(t: ToolDefinition): OpenAI.Chat.ChatCompletionTool {
  return {
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }
}

function parseToolCalls(calls?: OpenAI.Chat.ChatCompletionMessageToolCall[]): ToolCall[] {
  if (!calls?.length) return []
  return calls
    .filter((c): c is OpenAI.Chat.ChatCompletionMessageToolCall & { type: "function"; function: { name: string; arguments: string } } =>
      c.type === "function" && "function" in c
    )
    .map((c) => {
      let args: Record<string, unknown> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (c as any).function as { name: string; arguments: string }
      try { args = JSON.parse(fn.arguments) } catch { /* ignore */ }
      return { id: c.id, name: fn.name, arguments: args }
    })
}

function mapFinishReason(r: string | null | undefined): AIResponse["finishReason"] {
  if (r === "tool_calls") return "tool_calls"
  if (r === "length") return "length"
  return "stop"
}
