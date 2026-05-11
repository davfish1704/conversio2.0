export interface ParseResult<T> {
  success: boolean
  data: T | null
  error: string | null
  raw: string
}

export function parseJSON<T>(raw: string): ParseResult<T> {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/gi, "")
    .replace(/```/gi, "")
    .trim()

  const braceStart = cleaned.indexOf("{")
  const braceEnd = cleaned.lastIndexOf("}")
  const bracketStart = cleaned.indexOf("[")
  const bracketEnd = cleaned.lastIndexOf("]")

  let jsonStr: string | null = null

  if (braceStart !== -1 && braceEnd > braceStart) {
    jsonStr = cleaned.slice(braceStart, braceEnd + 1)
  } else if (bracketStart !== -1 && bracketEnd > bracketStart) {
    jsonStr = cleaned.slice(bracketStart, bracketEnd + 1)
  }

  if (!jsonStr) {
    return { success: false, data: null, error: "No JSON structure found", raw }
  }

  try {
    const parsed = JSON.parse(jsonStr) as T
    return { success: true, data: parsed, error: null, raw: jsonStr }
  } catch (e) {
    const fixed = attemptFix(jsonStr)
    if (fixed) {
      try {
        const parsed = JSON.parse(fixed) as T
        return { success: true, data: parsed, error: null, raw: fixed }
      } catch {}
    }
    return {
      success: false,
      data: null,
      error: e instanceof Error ? e.message : "Invalid JSON",
      raw: jsonStr,
    }
  }
}

export function extractNumber(raw: string): number | null {
  const cleaned = raw.trim()
  const num = parseFloat(cleaned)
  if (!isNaN(num)) return num
  const match = cleaned.match(/-?\d+\.?\d*/)
  return match ? parseFloat(match[0]) : null
}

function attemptFix(broken: string): string | null {
  let fixed = broken

  fixed = fixed.replace(/,\s*}/g, "}")
  fixed = fixed.replace(/,\s*\]/g, "]")

  fixed = fixed.replace(/(['"])?(\w+)(['"])?\s*:/g, '"$2":')

  fixed = fixed.replace(/:\s*'([^']*)'/g, ':"$1"')

  const openBraces = (fixed.match(/\{/g) || []).length
  const closeBraces = (fixed.match(/\}/g) || []).length
  for (let i = 0; i < openBraces - closeBraces; i++) fixed += "}"

  return fixed
}
