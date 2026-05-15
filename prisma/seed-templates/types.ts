import type { HandoffMode, StateType } from "@prisma/client"
import type { HandoffRule } from "@/lib/agents/handoff-engine"

export interface StateTemplate {
  name: string
  type: StateType
  orderIndex: number
  agentRole?: string
  agentSystemPrompt?: string
  agentGoal?: string
  handoffMode?: HandoffMode
  handoffRules?: HandoffRule[]
  minAgentConfidence?: number
  rules?: string
  availableTools?: string[]
  dataToCollect?: string[]
  escalateOnNoReply?: number
  escalateOnLowConfidence?: boolean
  escalateOnOffMission?: boolean
  // Resolved after creation — use the state name of the intended next state
  nextStateName?: string
}

export interface BoardTemplate {
  name: string
  description: string
  industry: string
  states: StateTemplate[]
}
