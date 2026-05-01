import { registerTool } from "./registry"

// Live tools
import { updateLeadDataTool } from "./definitions/update_lead_data"
import { advanceStateTool } from "./definitions/advance_state"
import { escalateToHumanTool } from "./definitions/escalate_to_human"
import { sendTemplateTool } from "./definitions/send_template"
import { setLeadScoreTool } from "./definitions/set_lead_score"

import { suggestChannelSwitchTool } from "./definitions/suggest-channel-switch"

// Stub tools
import { bookCalendarTool } from "./definitions/book_calendar"
import { sendEmailTool } from "./definitions/send_email"
import { triggerWebhookTool } from "./definitions/trigger_webhook"
import { createStripeLinkTool } from "./definitions/create_stripe_link"
import { generatePdfTool } from "./definitions/generate_pdf"

// Legacy primitive tools (still usable by AI states that include them in availableTools)
import { changStateLegacyTool, sendTextLegacyTool, storeMemoryLegacyTool, getHistoryLegacyTool } from "./definitions/legacy_tools"

registerTool(updateLeadDataTool)
registerTool(suggestChannelSwitchTool)
registerTool(advanceStateTool)
registerTool(escalateToHumanTool)
registerTool(sendTemplateTool)
registerTool(setLeadScoreTool)
registerTool(bookCalendarTool)
registerTool(sendEmailTool)
registerTool(triggerWebhookTool)
registerTool(createStripeLinkTool)
registerTool(generatePdfTool)
registerTool(changStateLegacyTool)
registerTool(sendTextLegacyTool)
registerTool(storeMemoryLegacyTool)
registerTool(getHistoryLegacyTool)

export { getAllTools, getTool, getToolDefinitions } from "./registry"

export const DEFAULT_AI_STATE_TOOLS = [
  "update_lead_data",
  "advance_state",
  "escalate_to_human",
]
