import type { SupervisorActionType } from "@prisma/client"

const ALWAYS_AUTO_APPROVE: SupervisorActionType[] = ["NOTIFY_ONLY", "UPDATE_LEAD_SCORE"]

const NEVER_AUTO_APPROVE: SupervisorActionType[] = [
  "KILL_CONVERSATION",
  "RESET_STATE",
  "REASSIGN_TO_STATE",
  "PAUSE_LEAD",
  "FORCE_HANDOFF",
]

export function canAutoApprove(
  proposedAction: SupervisorActionType,
  stateAutoApproveList: SupervisorActionType[],
): boolean {
  if (ALWAYS_AUTO_APPROVE.includes(proposedAction)) return true
  if (NEVER_AUTO_APPROVE.includes(proposedAction)) return false
  return stateAutoApproveList.includes(proposedAction)
}
