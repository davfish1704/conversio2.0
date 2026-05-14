import type { SupervisorAction } from "@prisma/client"

export function renderActionExecuted(action: SupervisorAction): string {
  const statusEmoji: Record<string, string> = {
    APPROVED:      "✅",
    REJECTED:      "❌",
    AUTO_APPROVED: "⚡",
    EXECUTED:      "✅",
    FAILED:        "💥",
    EXPIRED:       "⏰",
  }

  const emoji = statusEmoji[action.status] ?? "ℹ️"

  const lines = [
    `${emoji} *Aktion ${action.status}*`,
    "",
    `*Aktion:* ${action.proposedAction}`,
    `*Board:* ${action.boardId}`,
  ]

  if (action.approverUserId) {
    lines.push(`*Genehmigt von:* Benutzer`)
  }
  if (action.rejectReason) {
    lines.push(`*Ablehnungsgrund:* ${action.rejectReason}`)
  }
  if (action.executionError) {
    lines.push(`*Fehler:* ${action.executionError}`)
  }

  return lines.join("\n")
}
