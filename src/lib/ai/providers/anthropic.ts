import type { AIMessage, AIProvider, AIResponse, ToolDefinition, ToolCall } from "./types"

const ANTHROPIC_PRICING: Record<string, [number, number]> = {
  "claude-sonnet-4-6": [300, 1500],
  "claude-opus-4-7": [1500, 7500],
  "claude-haiku-4-5-20251001": [80, 400],
  "claude-3-5-sonnet-20241022": [300, 1500],
  "claude-3-opus-20240229": [1500, 7500],
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic"

  constructor(private apiKey: string) {}

  async chat(params: {
    messages: AIMessage[]
    model: string
    tools?: ToolDefinition[]
    temperature?: number
    maxTokens?: number
  }): Promise<AIResponse> {
    const systemMessages = params.messages.filter((m) => m.role === "system")
    const userMessages = params.messages.filter((m) => m.role !== "system")

    const system = systemMessages.map((m) => m.content).join("\n\n") || undefined

    const anthropicMessages = buildAnthropicMessages(userMessages)
    const anthropicTools = params.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))

    const body: Record<string, unknown> = {
      model: params.model,
      messages: anthropicMessages,
      max_tokens: params.maxTokens ?? 1000,
      temperature: params.temperature ?? 0.7,
    }
    if (system) body.system = system
    if (anthropicTools?.length) body.tools = anthropicTools

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }

    const data = await res.json()

    const textContent = data.content
      ?.filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("") ?? ""

    const toolUseBlocks: ToolCall[] = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "tool_use")
      .map((b: { id: string; name: string; input: Record<string, unknown> }) => ({
        id: b.id,
        name: b.name,
        arguments: b.input,
      }))

    const finishReason: AIResponse["finishReason"] =
      data.stop_reason === "tool_use" ? "tool_calls"
      : data.stop_reason === "max_tokens" ? "length"
      : "stop"

    return {
      content: textContent,
      toolCalls: toolUseBlocks,
      finishReason,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      model: data.model ?? params.model,
      rawResponse: data,
    }
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const [inCpm, outCpm] = ANTHROPIC_PRICING[model] ?? [300, 1500]
    return (inputTokens * inCpm + outputTokens * outCpm) / 1_000_000
  }
}

// ── Anthropic message format ──────────────────────────────────────────────────

type AnthropicMessage = {
  role: "user" | "assistant"
  content: string | AnthropicContent[]
}

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string }

function buildAnthropicMessages(messages: AIMessage[]): AnthropicMessage[] {
  const result: AnthropicMessage[] = []

  for (const m of messages) {
    if (m.role === "user") {
      result.push({ role: "user", content: m.content })
    } else if (m.role === "assistant") {
      if (m.tool_calls?.length) {
        result.push({
          role: "assistant",
          content: [
            ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
            ...m.tool_calls.map((tc) => ({
              type: "tool_use" as const,
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            })),
          ],
        })
      } else {
        result.push({ role: "assistant", content: m.content })
      }
    } else if (m.role === "tool") {
      // Anthropic tool results must be in a user turn
      const last = result[result.length - 1]
      const toolResult: AnthropicContent = {
        type: "tool_result",
        tool_use_id: m.tool_call_id!,
        content: m.content,
      }
      if (last?.role === "user" && Array.isArray(last.content)) {
        ;(last.content as AnthropicContent[]).push(toolResult)
      } else {
        result.push({ role: "user", content: [toolResult] })
      }
    }
  }

  return result
}
