import { aiRegistry } from "@/lib/ai/registry"
import { parseJSON, type ParseResult } from "./parser"
import { validateObject, type ValidationRule, type ValidationResult } from "./validator"

export interface ExtractionConfig {
  boardId: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export async function extractStructuredJSON<T extends Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string,
  validationRules: ValidationRule[],
  config: ExtractionConfig,
  maxRetries: number = 2,
): Promise<{ data: T | null; raw: string; validation: ValidationResult; retries: number }> {
  let lastResult: ParseResult<T> = { success: false, data: null, error: "No attempt", raw: "" }
  let lastValidation: ValidationResult = { valid: false, errors: ["No attempt"] }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await aiRegistry.execute({
      boardId: config.boardId,
      purpose: "extraction",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: attempt > 0 ? `${userPrompt}\n\nPrevious attempt produced invalid JSON. Ensure your response is valid JSON only, no markdown, no extra text.` : userPrompt },
      ],
      temperature: attempt > 0 ? 0 : config.temperature ?? 0,
      maxTokens: config.maxTokens ?? 300,
    })

    lastResult = parseJSON<T>(response.content ?? "{}")

    if (!lastResult.success) {
      continue
    }

    lastValidation = validateObject(lastResult.data as Record<string, unknown>, validationRules)

    if (lastValidation.valid) {
      return {
        data: lastResult.data,
        raw: lastResult.raw,
        validation: lastValidation,
        retries: attempt,
      }
    }
  }

  return {
    data: lastResult.data,
    raw: lastResult.raw,
    validation: lastValidation,
    retries: maxRetries,
  }
}
