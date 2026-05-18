import { describe, it, expect } from "vitest"
import {
  detectLoopOnState,
  detectRepeatedToolFailure,
  detectLowConfidenceHandoffs,
  detectCostSpike,
  detectStuckLead,
  runAllRules,
  type AgentRunSummary,
  type DetectionContext,
} from "../src/lib/supervisor/detection-rules"

function makeRun(overrides: Partial<AgentRunSummary> = {}): AgentRunSummary {
  return {
    id: "run_1",
    stateId: "state_a",
    outcome: "SUCCESS_CONTINUE",
    handoffProposed: false,
    agentConfidence: null,
    costCents: 10,
    errorMessage: null,
    createdAt: new Date(),
    toolCallsMade: [],
    ...overrides,
  }
}

describe("detectLoopOnState", () => {
  it("detects 4+ consecutive runs on same state without handoff", () => {
    const runs = Array.from({ length: 4 }, (_, i) =>
      makeRun({ id: `run_${i}`, stateId: "state_a", outcome: "SUCCESS_CONTINUE" }),
    )
    const result = detectLoopOnState(runs)
    expect(result.detected).toBe(true)
    expect(result.ruleId).toBe("loop_on_state")
    expect(result.severity).toBe("high")
    expect(result.suggestedAction).toBe("FORCE_HANDOFF")
  })

  it("does not detect loop when handoff occurs", () => {
    const runs = [
      makeRun({ id: "run_1", stateId: "state_a", outcome: "SUCCESS_CONTINUE" }),
      makeRun({ id: "run_2", stateId: "state_a", outcome: "SUCCESS_HANDOFF", handoffProposed: true }),
      makeRun({ id: "run_3", stateId: "state_b", outcome: "SUCCESS_CONTINUE" }),
      makeRun({ id: "run_4", stateId: "state_b", outcome: "SUCCESS_CONTINUE" }),
    ]
    const result = detectLoopOnState(runs)
    expect(result.detected).toBe(false)
  })

  it("does not detect if fewer than 4 runs", () => {
    const runs = Array.from({ length: 3 }, (_, i) =>
      makeRun({ id: `run_${i}`, stateId: "state_a" }),
    )
    const result = detectLoopOnState(runs)
    expect(result.detected).toBe(false)
  })
})

describe("detectRepeatedToolFailure", () => {
  it("detects 3 consecutive tool failures", () => {
    const runs = Array.from({ length: 3 }, (_, i) =>
      makeRun({
        id: `run_${i}`,
        outcome: "TOOL_EXECUTION_FAILED",
        errorMessage: "Tool timeout",
        toolCallsMade: [{ name: "send_message", args: {}, error: "timeout" }],
      }),
    )
    const result = detectRepeatedToolFailure(runs)
    expect(result.detected).toBe(true)
    expect(result.severity).toBe("high")
    expect(result.suggestedAction).toBe("RESET_STATE")
  })

  it("does not detect if mixed with success", () => {
    const runs = [
      makeRun({ id: "run_1", outcome: "SUCCESS_CONTINUE" }),
      makeRun({ id: "run_2", outcome: "TOOL_EXECUTION_FAILED" }),
      makeRun({ id: "run_3", outcome: "TOOL_EXECUTION_FAILED" }),
    ]
    const result = detectRepeatedToolFailure(runs)
    expect(result.detected).toBe(false)
  })

  it("does not detect if fewer than 3 runs", () => {
    const runs = [
      makeRun({ id: "run_1", outcome: "TOOL_EXECUTION_FAILED" }),
      makeRun({ id: "run_2", outcome: "TOOL_EXECUTION_FAILED" }),
    ]
    const result = detectRepeatedToolFailure(runs)
    expect(result.detected).toBe(false)
  })
})

describe("detectLowConfidenceHandoffs", () => {
  it("detects handoff with low confidence", () => {
    const runs = [
      makeRun({
        id: "run_1",
        handoffProposed: true,
        agentConfidence: 0.3,
      }),
    ]
    const result = detectLowConfidenceHandoffs(runs)
    expect(result.detected).toBe(true)
    expect(result.severity).toBe("medium")
    expect(result.suggestedAction).toBe("REQUEST_HUMAN_TAKEOVER")
  })

  it("ignores runs with sufficient confidence", () => {
    const runs = [
      makeRun({
        id: "run_1",
        handoffProposed: true,
        agentConfidence: 0.8,
      }),
    ]
    const result = detectLowConfidenceHandoffs(runs)
    expect(result.detected).toBe(false)
  })

  it("ignores runs without handoff proposal", () => {
    const runs = [
      makeRun({ id: "run_1", handoffProposed: false, agentConfidence: 0.3 }),
    ]
    const result = detectLowConfidenceHandoffs(runs)
    expect(result.detected).toBe(false)
  })
})

describe("detectCostSpike", () => {
  const ctx: DetectionContext = { boardAvgCostCents: 10, initialStateId: null }

  it("detects cost > 5x board average", () => {
    const runs = Array.from({ length: 3 }, (_, i) =>
      makeRun({ id: `run_${i}`, costCents: 100 }),
    )
    const result = detectCostSpike(runs, ctx)
    expect(result.detected).toBe(true)
    expect(result.severity).toBe("medium")
    expect(result.suggestedAction).toBe("NOTIFY_ONLY")
  })

  it("does not detect cost within normal range", () => {
    const runs = Array.from({ length: 3 }, (_, i) =>
      makeRun({ id: `run_${i}`, costCents: 5 }),
    )
    const result = detectCostSpike(runs, ctx)
    expect(result.detected).toBe(false)
  })

  it("returns not detected without context", () => {
    const runs = [makeRun({ costCents: 100 })]
    const result = detectCostSpike(runs)
    expect(result.detected).toBe(false)
  })
})

describe("detectStuckLead", () => {
  it("detects lead with last run > 12h ago", () => {
    const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000)
    const runs = [makeRun({ id: "run_1", createdAt: oldDate })]
    const result = detectStuckLead(runs)
    expect(result.detected).toBe(true)
    expect(result.severity).toBe("low")
    expect(result.suggestedAction).toBe("NOTIFY_ONLY")
  })

  it("does not detect recently active lead", () => {
    const runs = [makeRun({ id: "run_1", createdAt: new Date() })]
    const result = detectStuckLead(runs)
    expect(result.detected).toBe(false)
  })

  it("returns not detected for empty runs", () => {
    const result = detectStuckLead([])
    expect(result.detected).toBe(false)
  })
})

describe("runAllRules", () => {
  it("returns only detected rules", () => {
    const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000)
    const runs = [
      makeRun({
        id: "run_1",
        stateId: "state_a",
        outcome: "SUCCESS_CONTINUE",
        createdAt: oldDate,
      }),
      makeRun({
        id: "run_2",
        stateId: "state_a",
        outcome: "SUCCESS_CONTINUE",
        createdAt: oldDate,
      }),
      makeRun({
        id: "run_3",
        stateId: "state_a",
        outcome: "SUCCESS_CONTINUE",
        createdAt: oldDate,
      }),
      makeRun({
        id: "run_4",
        stateId: "state_a",
        outcome: "SUCCESS_CONTINUE",
        createdAt: oldDate,
      }),
    ]

    const results = runAllRules(runs)
    const detected = results.filter((r) => r.detected)
    expect(detected.length).toBeGreaterThanOrEqual(1)
    expect(detected.some((r) => r.ruleId === "loop_on_state")).toBe(true)
    expect(detected.some((r) => r.ruleId === "stuck_lead")).toBe(true)
  })

  it("returns empty array when no rules fire", () => {
    const runs = [
      makeRun({ id: "run_1", outcome: "SUCCESS_CONTINUE" }),
    ]
    const results = runAllRules(runs)
    expect(results.every((r) => r.detected === false)).toBe(true)
  })
})
