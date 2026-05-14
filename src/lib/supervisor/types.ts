import type { SupervisorTriggerType, SupervisorActionType, SupervisorUrgency } from "@prisma/client"

export interface SupervisorInput {
  conversationId: string
  boardId:        string
  leadId:         string
  triggerType:    SupervisorTriggerType
  triggerContext: Record<string, unknown>
}

export interface SupervisorDecision {
  proposedAction: SupervisorActionType
  actionParams:   Record<string, unknown>
  reasoning:      string
  urgency:        SupervisorUrgency
}
