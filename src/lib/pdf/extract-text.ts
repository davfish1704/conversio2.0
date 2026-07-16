// PDF text extraction for asset indexing.
// Uses pdf-parse (CommonJS) via require to avoid ESM interop issues in Next.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number }>

const MAX_CHARS = 50_000

export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const data = await pdfParse(buffer, { max: 0 })
    const text = data.text?.replace(/\s+/g, " ").trim()
    if (!text) return null
    return text.slice(0, MAX_CHARS)
  } catch (err) {
    console.error("[pdf-extract] Fehler:", err instanceof Error ? err.message : err)
    return null
  }
}
