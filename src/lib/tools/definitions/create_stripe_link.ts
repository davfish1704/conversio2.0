import type { Tool, ToolResult } from "@/lib/tools/registry"

export const createStripeLinkTool: Tool = {
  name: "create_stripe_link",
  description: "Erstellt einen Stripe Payment Link und sendet ihn an den Lead.",
  isStub: true,
  parameters: {
    type: "object",
    properties: {
      amount: { type: "number", description: "Betrag in Cent (z.B. 9900 für 99,00 €)" },
      currency: { type: "string", default: "eur", description: "Währung (eur, usd, ...)" },
      productName: { type: "string", description: "Produktname auf dem Payment Link" },
    },
    required: ["amount", "productName"],
  },
  async execute(): Promise<ToolResult> {
    return {
      success: false,
      error: "TOOL_STUB_NOT_ENABLED: Stripe-Integration benötigt Stripe-Verbindung. Kontaktiere den Support.",
    }
  },
}
