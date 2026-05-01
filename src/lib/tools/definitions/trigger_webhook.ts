import type { Tool, ToolResult } from "@/lib/tools/registry"

export const triggerWebhookTool: Tool = {
  name: "trigger_webhook",
  description: "Sendet einen HTTP-POST an eine externe URL (z.B. Zapier, Make, eigenes Backend).",
  isStub: true,
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "Ziel-URL" },
      payload: { type: "object", description: "JSON-Payload" },
      secret: { type: "string", description: "Optionaler Bearer-Token oder HMAC-Secret" },
    },
    required: ["url", "payload"],
  },
  async execute(): Promise<ToolResult> {
    return {
      success: false,
      error: "TOOL_STUB_NOT_ENABLED: Webhook-Tool muss in den Board-Einstellungen konfiguriert werden.",
    }
  },
}
