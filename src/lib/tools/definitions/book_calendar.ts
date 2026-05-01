import type { Tool, ToolResult } from "@/lib/tools/registry"

export const bookCalendarTool: Tool = {
  name: "book_calendar",
  description: "Bucht einen Termin über Cal.com. Sendet automatisch eine Bestätigungsnachricht mit dem Buchungslink.",
  isStub: true,
  parameters: {
    type: "object",
    properties: {
      duration: { type: "number", description: "Dauer in Minuten (z.B. 30, 60)" },
      attendeeEmail: { type: "string", description: "E-Mail des Lead (wenn bekannt)" },
      preferredTimes: { type: "array", items: { type: "string" }, description: "Bevorzugte Zeiten (ISO 8601)" },
    },
    required: ["duration"],
  },
  async execute(): Promise<ToolResult> {
    return {
      success: false,
      error: "TOOL_STUB_NOT_ENABLED: Kalender-Integration benötigt Cal.com-Verbindung. Kontaktiere den Support.",
    }
  },
}
