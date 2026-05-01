import type { Tool, ToolResult } from "@/lib/tools/registry"

export const sendEmailTool: Tool = {
  name: "send_email",
  description: "Sendet eine E-Mail an den Lead über Resend.",
  isStub: true,
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "Empfänger-E-Mail" },
      subject: { type: "string", description: "Betreff" },
      body: { type: "string", description: "E-Mail-Inhalt (Plaintext oder HTML)" },
    },
    required: ["to", "subject", "body"],
  },
  async execute(): Promise<ToolResult> {
    return {
      success: false,
      error: "TOOL_STUB_NOT_ENABLED: E-Mail-Integration benötigt Resend-Verbindung. Kontaktiere den Support.",
    }
  },
}
