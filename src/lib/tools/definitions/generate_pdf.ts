import type { Tool, ToolResult } from "@/lib/tools/registry"

export const generatePdfTool: Tool = {
  name: "generate_pdf",
  description: "Generiert ein PDF-Dokument (z.B. Angebot, Vertrag) aus einem Template und sendet es an den Lead.",
  isStub: true,
  parameters: {
    type: "object",
    properties: {
      templateId: { type: "string", description: "ID des PDF-Templates" },
      data: { type: "object", description: "Daten die in das Template eingesetzt werden" },
    },
    required: ["templateId", "data"],
  },
  async execute(): Promise<ToolResult> {
    return {
      success: false,
      error: "TOOL_STUB_NOT_ENABLED: PDF-Generierung benötigt eine externe Service-Verbindung. Kontaktiere den Support.",
    }
  },
}
