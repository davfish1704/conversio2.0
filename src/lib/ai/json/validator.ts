export interface ValidationRule {
  field: string
  type: "string" | "number" | "boolean" | "object" | "array"
  required?: boolean
  min?: number
  max?: number
  enum?: string[]
  pattern?: RegExp
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateObject<T extends Record<string, unknown>>(
  data: unknown,
  rules: ValidationRule[],
): ValidationResult {
  const errors: string[] = []

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Root value must be an object"] }
  }

  const obj = data as Record<string, unknown>

  for (const rule of rules) {
    const value = obj[rule.field]

    if (value === undefined || value === null) {
      if (rule.required) {
        errors.push(`Missing required field: ${rule.field}`)
      }
      continue
    }

    const actualType = Array.isArray(value) ? "array" : typeof value
    if (actualType !== rule.type) {
      errors.push(`Field "${rule.field}" expected ${rule.type}, got ${actualType}`)
      continue
    }

    if (rule.type === "number" && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`Field "${rule.field}" below minimum ${rule.min}`)
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`Field "${rule.field}" above maximum ${rule.max}`)
      }
    }

    if (rule.type === "string" && typeof value === "string") {
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(
          `Field "${rule.field}" must be one of: ${rule.enum.join(", ")}, got "${value}"`,
        )
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`Field "${rule.field}" does not match required pattern`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export const INTENT_VALIDATION_RULES: ValidationRule[] = [
  { field: "intent", type: "string", required: true },
  { field: "confidence", type: "number", required: true, min: 0, max: 1 },
  { field: "entities", type: "object", required: false },
]

export const MEMORY_EXTRACTION_RULES: ValidationRule[] = [
  { field: "customer_type", type: "string", required: false, enum: ["lead", "tenant", "owner", "unknown"] },
  { field: "language", type: "string", required: false },
  { field: "intent", type: "string", required: true },
  { field: "facts", type: "object", required: false },
  { field: "action_needed", type: "string", required: false },
]
