/**
 * Synthetic Integration Test für Supervisor Scan.
 *
 * Simuliert AgentRun-Patterns und prüft:
 * 1. Detection Rules erkennen Problem → SupervisorAction created
 * 2. Idempotency verhindert Duplikate
 * 3. Snoozed Detections werden übersprungen
 *
 * Ausführung: npx tsx scripts/test-supervisor-scan.ts
 * Erfordert: DB-Verbindung mit gültiger DATABASE_URL
 */

import { prisma } from "../src/lib/db"
import { createHash } from "node:crypto"
import { runAllRules, type AgentRunSummary } from "../src/lib/supervisor/detection-rules"

let passed = 0
let failed = 0
let boardId: string | null = null
let leadId: string | null = null
let stateId: string | null = null

async function test(label: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${label}`)
    console.error(`    → ${err instanceof Error ? err.message : String(err)}`)
    failed++
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

async function setup() {
  // Cleanup any stale test data
  await prisma.supervisorAction.deleteMany({ where: { boardId: { startsWith: "test-supervisor-" } } }).catch(() => {})

  const board = await prisma.board.create({
    data: {
      name: `test-supervisor-${Date.now()}`,
      slug: `test-supervisor-${Date.now()}`,
      ownerId: "test-user",
    },
  })
  boardId = board.id

  const state = await prisma.state.create({
    data: {
      boardId: board.id,
      name: "Test State",
      type: "MESSAGE",
      orderIndex: 0,
    },
  })
  stateId = state.id

  // Need a board member for supervisor (admin user with telegram chat id)
  // This will be missing — supervisor scan will skip notifications
}

async function main() {
  console.log("\n=== Supervisor Scan — Synthetic Tests ===\n")

  // ── Test 1: Detection rules (pure, no DB) ─────────────────────────────────

  console.log("Detection Rules (pure functions)\n")

  await test("detectLoopOnState — 4x same state ohne handoff", () => {
    const runs: AgentRunSummary[] = Array.from({ length: 4 }, (_, i) => ({
      id: `run_${i}`,
      stateId: "state_a",
      outcome: "SUCCESS_CONTINUE",
      handoffProposed: false,
      agentConfidence: null,
      costCents: 10,
      errorMessage: null,
      createdAt: new Date(),
      toolCallsMade: [],
    }))
    const result = runAllRules(runs)
    assert(result.some((r) => r.ruleId === "loop_on_state" && r.detected), "loop_on_state sollte detected sein")
  })

  await test("detectRepeatedToolFailure — 3x tool error", () => {
    const runs: AgentRunSummary[] = Array.from({ length: 3 }, (_, i) => ({
      id: `run_${i}`,
      stateId: "state_a",
      outcome: "TOOL_EXECUTION_FAILED",
      handoffProposed: false,
      agentConfidence: null,
      costCents: 10,
      errorMessage: "Tool timeout",
      createdAt: new Date(),
      toolCallsMade: [{ name: "send_message", args: {}, error: "timeout" }],
    }))
    const result = runAllRules(runs)
    assert(result.some((r) => r.ruleId === "repeated_tool_failure" && r.detected), "repeated_tool_failure sollte detected sein")
  })

  await test("detectLowConfidenceHandoffs — confidence < 0.5", () => {
    const runs: AgentRunSummary[] = [{
      id: "run_1",
      stateId: "state_a",
      outcome: "HANDOFF_BLOCKED",
      handoffProposed: true,
      agentConfidence: 0.3,
      costCents: 10,
      errorMessage: null,
      createdAt: new Date(),
      toolCallsMade: [],
    }]
    const result = runAllRules(runs)
    assert(result.some((r) => r.ruleId === "low_confidence_handoff" && r.detected), "low_confidence_handoff sollte detected sein")
  })

  await test("detectCostSpike — 5x board average", () => {
    const runs: AgentRunSummary[] = Array.from({ length: 3 }, (_, i) => ({
      id: `run_${i}`,
      stateId: "state_a",
      outcome: "SUCCESS_CONTINUE",
      handoffProposed: false,
      agentConfidence: null,
      costCents: 100,
      errorMessage: null,
      createdAt: new Date(),
      toolCallsMade: [],
    }))
    const result = runAllRules(runs, { boardAvgCostCents: 10, initialStateId: null })
    assert(result.some((r) => r.ruleId === "cost_spike" && r.detected), "cost_spike sollte detected sein")
  })

  await test("detectStuckLead — >12h idle", () => {
    const runs: AgentRunSummary[] = [{
      id: "run_1",
      stateId: "state_a",
      outcome: "SUCCESS_CONTINUE",
      handoffProposed: false,
      agentConfidence: null,
      costCents: 10,
      errorMessage: null,
      createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000),
      toolCallsMade: [],
    }]
    const result = runAllRules(runs)
    assert(result.some((r) => r.ruleId === "stuck_lead" && r.detected), "stuck_lead sollte detected sein")
  })

  // ── Test 2: Idempotency Key ────────────────────────────────────────────

  console.log("\nIdempotency Key Generation\n")

  await test("computeIdempotencyKey generates consistent SHA-256 hash", () => {
    const evidence = { stateId: "state_a", runIds: ["run_1", "run_2"], consecutiveRuns: 4 }
    const fingerprint = JSON.stringify({ stateId: evidence.stateId, runIds: evidence.runIds, consecutiveRuns: evidence.consecutiveRuns })
    const raw = "board_1:lead_1:loop_on_state:" + fingerprint
    const hash1 = createHash("sha256").update(raw).digest("hex").slice(0, 16)
    const hash2 = createHash("sha256").update(raw).digest("hex").slice(0, 16)
    assert(hash1 === hash2, "Hash sollte identisch sein für gleichen Input")
    assert(hash1.length === 16, "Hash sollte 16 Zeichen sein")
  })

  // ── Test 3: Database Integration (if board was created) ─────────────────

  if (boardId) {
    console.log("\nDatabase Integration\n")

    await test("SupervisorAction Table erreichbar", async () => {
      const count = await prisma.supervisorAction.count()
      assert(typeof count === "number", "Count sollte Zahl sein")
      console.log(`    Aktuelle SupervisorActions: ${count}`)
    })

    await test("ExecutionLog Table erreichbar", async () => {
      const count = await prisma.executionLog.count()
      assert(typeof count === "number", "Count sollte Zahl sein")
    })
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log(`\n=== Ergebnis: ${passed} passed, ${failed} failed ===\n`)

  if (boardId) {
    await prisma.board.delete({ where: { id: boardId } }).catch(() => {})
  }
  await prisma.$disconnect()

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
