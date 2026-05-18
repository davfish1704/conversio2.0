import type { SupervisorAction } from "@prisma/client"

export function renderApprovalRequest(action: SupervisorAction): string {
  const urgencyEmoji: Record<string, string> = {
    LOW: "🔵",
    NORMAL: "🟡",
    HIGH: "🟠",
    CRITICAL: "🔴",
  }

  const actionLabel: Record<string, string> = {
    RESET_STATE: "State zurücksetzen",
    REASSIGN_TO_STATE: "State neu zuweisen",
    PAUSE_LEAD: "Lead pausieren",
    RESUME_LEAD: "Lead fortsetzen",
    FORCE_HANDOFF: "Handoff erzwingen",
    NOTIFY_ONLY: "Nur Benachrichtigung",
    KILL_CONVERSATION: "Conversation beenden",
    UPDATE_LEAD_SCORE: "Lead Score anpassen",
    REQUEST_HUMAN_TAKEOVER: "Human Takeover anfordern",
  }

  const emoji = urgencyEmoji[action.urgency] ?? "🟡"
  const label = actionLabel[action.proposedAction] ?? action.proposedAction

  const params = action.actionParams as Record<string, unknown>
  const paramsText = Object.keys(params).length > 0
    ? `\n\nParameter:\n${Object.entries(params).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`
    : ""

  return [
    `${emoji} *Supervisor-Aktion erforderlich*`,
    "",
    `*Aktion:* ${label}`,
    `*Dringlichkeit:* ${action.urgency}`,
    `*Trigger:* ${action.triggerType}`,
    "",
    `*Begründung:*`,
    action.reasoning,
    paramsText,
    "",
    `*Action ID:* \`${action.id}\``,
  ].join("\n")
}

export function approvalInlineKeyboard(actionId: string) {
  return {
    inline_keyboard: [[
      { text: "✅ Genehmigen", callback_data: `supervisor:approve:${actionId}` },
      { text: "❌ Ablehnen",   callback_data: `supervisor:reject:${actionId}` },
      { text: "⏸ Schlummern",   callback_data: `supervisor:snooze:${actionId}` },
    ]],
  }
}
