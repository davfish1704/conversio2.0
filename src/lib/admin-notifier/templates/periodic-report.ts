export interface PeriodicReportStats {
  period: string
  totalAgentRuns: number
  failedRuns: number
  blockedHandoffs: number
  escalations: number
  pendingSupervisorActions: number
}

export function renderPeriodicReport(stats: PeriodicReportStats): string {
  const health = stats.failedRuns === 0 && stats.escalations === 0 ? "✅" : "⚠️"

  return [
    `${health} *Supervisor-Bericht — ${stats.period}*`,
    "",
    `Agent-Runs:           ${stats.totalAgentRuns}`,
    `Fehlgeschlagen:       ${stats.failedRuns}`,
    `Handoffs blockiert:   ${stats.blockedHandoffs}`,
    `Eskalationen:         ${stats.escalations}`,
    `Offene Aktionen:      ${stats.pendingSupervisorActions}`,
  ].join("\n")
}
