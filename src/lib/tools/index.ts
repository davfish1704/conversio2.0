import { registerTool } from "./registry"

// Live tools
import { updateQualificationTool } from "./definitions/update_qualification"
import { updateLeadDataTool } from "./definitions/update_lead_data"
import { advanceStateTool } from "./definitions/advance_state"
import { escalateToHumanTool } from "./definitions/escalate_to_human"
import { sendTemplateTool } from "./definitions/send_template"
import { setLeadScoreTool } from "./definitions/set_lead_score"
import { suggestChannelSwitchTool } from "./definitions/suggest-channel-switch"
import { sendAssetTool } from "./definitions/send-asset"
import { searchAssetsTool } from "./definitions/search-assets"

// Sub-Agent signal tools (always available in AI states)
import { handoffProposedTool }         from "./definitions/handoff_proposed"
import { escalateToSupervisorTool }    from "./definitions/escalate_to_supervisor"

// Legacy primitive tools (still usable by AI states that include them in availableTools)
import { changStateLegacyTool, sendTextLegacyTool, storeMemoryLegacyTool, getHistoryLegacyTool } from "./definitions/legacy_tools"

registerTool(updateQualificationTool)
registerTool(updateLeadDataTool)
registerTool(suggestChannelSwitchTool)
registerTool(advanceStateTool)
registerTool(escalateToHumanTool)
registerTool(sendTemplateTool)
registerTool(setLeadScoreTool)
registerTool(sendAssetTool)
registerTool(searchAssetsTool)
registerTool(handoffProposedTool)
registerTool(escalateToSupervisorTool)
registerTool(changStateLegacyTool)
registerTool(sendTextLegacyTool)
registerTool(storeMemoryLegacyTool)
registerTool(getHistoryLegacyTool)

export { getAllTools, getTool, getToolDefinitions } from "./registry"

export const DEFAULT_AI_STATE_TOOLS = [
  "update_qualification",
  "update_lead_data",
  "advance_state",
  "escalate_to_human",
]
