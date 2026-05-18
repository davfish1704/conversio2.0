import type { SupervisorActionType } from "@prisma/client"

export type Severity = "low" | "medium" | "high"

export interface DetectionResult {
  detected: boolean
  severity: Severity
  ruleId: string
  ruleLabel: string
  evidence: Record<string, unknown>
  suggestedAction: SupervisorActionType
}

export interface AgentRunSummary {
  id: string
  stateId: string
  outcome: string
  handoffProposed: boolean
  agentConfidence: number | null
  costCents: number
  errorMessage: string | null
  createdAt: Date
  toolCallsMade: Array<{ name: string; args: unknown; error?: string }>
}

export interface DetectionContext {
  boardAvgCostCents: number
  initialStateId: string | null
}

// ──────────────────────────────────────────────
// Rule 1: Loop on State
// >3 consecutive runs on the same state without successful handoff
// ──────────────────────────────────────────────

export function detectLoopOnState(
  runs: AgentRunSummary[],
): DetectionResult {
  if (runs.length < 4) {
    return emptyResult("loop_on_state")
  }

  const recent = runs.slice(0, 4)
  const stateIds = recent.map((r) => r.stateId)
  const allSameState = stateIds.every((id) => id === stateIds[0])
  const noHandoff = recent.every(
    (r) => r.outcome !== "SUCCESS_HANDOFF" && !r.handoffProposed,
  )

  if (allSameState && noHandoff) {
    return {
      detected: true,
      severity: "high",
      ruleId: "loop_on_state",
      ruleLabel: "Loop on State",
      evidence: {
        stateId: stateIds[0],
        consecutiveRuns: 4,
        outcomes: recent.map((r) => r.outcome),
        runIds: recent.map((r) => r.id),
      },
      suggestedAction: "FORCE_HANDOFF",
    }
  }

  return emptyResult("loop_on_state")
}

// ──────────────────────────────────────────────
// Rule 2: Repeated Tool Failure
// >2 consecutive tool calls with error
// ──────────────────────────────────────────────

export function detectRepeatedToolFailure(
  runs: AgentRunSummary[],
): DetectionResult {
  if (runs.length < 3) {
    return emptyResult("repeated_tool_failure")
  }

  const recent = runs.slice(0, 3)
  const allToolErrors = recent.every(
    (r) =>
      r.outcome === "TOOL_EXECUTION_FAILED" ||
      r.toolCallsMade.some((tc) => "error" in tc && tc.error),
  )

  if (allToolErrors) {
    const failedTools = [
      ...new Set(
        recent.flatMap((r) =>
          r.toolCallsMade
            .filter((tc) => "error" in tc && tc.error)
            .map((tc) => tc.name),
        ),
      ),
    ]

    return {
      detected: true,
      severity: "high",
      ruleId: "repeated_tool_failure",
      ruleLabel: "Repeated Tool Failure",
      evidence: {
        consecutiveFailures: 3,
        failedTools,
        errorMessages: recent
          .map((r) => r.errorMessage)
          .filter(Boolean),
        runIds: recent.map((r) => r.id),
      },
      suggestedAction: "RESET_STATE",
    }
  }

  return emptyResult("repeated_tool_failure")
}

// ──────────────────────────────────────────────
// Rule 3: Low Confidence Handoffs
// Handoff proposed with agent confidence < 0.5
// ──────────────────────────────────────────────

export function detectLowConfidenceHandoffs(
  runs: AgentRunSummary[],
): DetectionResult {
  if (runs.length === 0) {
    return emptyResult("low_confidence_handoff")
  }

  const lowConfidence = runs.filter(
    (r) =>
      r.handoffProposed &&
      r.agentConfidence != null &&
      r.agentConfidence < 0.5,
  )

  if (lowConfidence.length > 0) {
    const latest = lowConfidence[0]
    return {
      detected: true,
      severity: "medium",
      ruleId: "low_confidence_handoff",
      ruleLabel: "Low Confidence Handoff",
      evidence: {
        stateId: latest.stateId,
        agentConfidence: latest.agentConfidence,
        errorMessage: latest.errorMessage,
        runId: latest.id,
        totalLowConfidence: lowConfidence.length,
      },
      suggestedAction: "REQUEST_HUMAN_TAKEOVER",
    }
  }

  return emptyResult("low_confidence_handoff")
}

// ──────────────────────────────────────────────
// Rule 4: Cost Spike
// Lead cost in last 24h > 5x board average
// ──────────────────────────────────────────────

export function detectCostSpike(
  runs: AgentRunSummary[],
  context?: DetectionContext,
): DetectionResult {
  if (runs.length < 2 || !context) {
    return emptyResult("cost_spike")
  }

  const totalCost = runs.reduce((sum, r) => sum + r.costCents, 0)
  const avgCostPerRun = totalCost / runs.length
  const threshold = context.boardAvgCostCents * 5

  if (avgCostPerRun > threshold && avgCostPerRun > 0) {
    return {
      detected: true,
      severity: "medium",
      ruleId: "cost_spike",
      ruleLabel: "Cost Spike",
      evidence: {
        leadAvgCostCents: Math.round(avgCostPerRun),
        boardAvgCostCents: Math.round(context.boardAvgCostCents),
        thresholdExceededBy: Math.round(avgCostPerRun / context.boardAvgCostCents),
        totalRuns: runs.length,
        totalCostCents: Math.round(totalCost),
      },
      suggestedAction: "NOTIFY_ONLY",
    }
  }

  return emptyResult("cost_spike")
}

// ──────────────────────────────────────────────
// Rule 5: Stuck Lead
// Last AgentRun > 12h old, lead still in active stage
// ──────────────────────────────────────────────

export function detectStuckLead(
  runs: AgentRunSummary[],
): DetectionResult {
  if (runs.length === 0) {
    return emptyResult("stuck_lead")
  }

  const latestRun = runs[0]
  const hoursSinceLastRun =
    (Date.now() - latestRun.createdAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastRun > 12) {
    return {
      detected: true,
      severity: "low",
      ruleId: "stuck_lead",
      ruleLabel: "Stuck Lead",
      evidence: {
        lastRunId: latestRun.id,
        lastRunOutcome: latestRun.outcome,
        lastRunStateId: latestRun.stateId,
        hoursSinceLastRun: Math.round(hoursSinceLastRun * 10) / 10,
        lastRunCreatedAt: latestRun.createdAt.toISOString(),
      },
      suggestedAction: "NOTIFY_ONLY",
    }
  }

  return emptyResult("stuck_lead")
}

// ──────────────────────────────────────────────
// Composite runner — runs all rules, returns only detected ones
// ──────────────────────────────────────────────

export function runAllRules(
  runs: AgentRunSummary[],
  context?: DetectionContext,
): DetectionResult[] {
  const results: DetectionResult[] = [
    detectLoopOnState(runs),
    detectRepeatedToolFailure(runs),
    detectLowConfidenceHandoffs(runs),
    detectCostSpike(runs, context),
    detectStuckLead(runs),
  ]

  return results.filter((r) => r.detected)
}

function emptyResult(ruleId: string): DetectionResult {
  return {
    detected: false,
    severity: "low",
    ruleId,
    ruleLabel: "",
    evidence: {},
    suggestedAction: "NOTIFY_ONLY",
  }
}
