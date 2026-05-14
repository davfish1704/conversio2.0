/**
 * Smoke-Tests für Phase 2 Supervisor Agent.
 * Prüft Module auf Importierbarkeit, Logik und Template-Rendering.
 * Keine DB-Verbindung erforderlich.
 *
 * Ausführen: npx tsx scripts/test-supervisor-flow.ts
 */

let passed = 0
let failed = 0

async function test(label: string, fn: () => void | Promise<void>): Promise<void> {
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

async function main() {
  console.log("\n=== Modul-Imports ===\n")

  await test("auto-approve importierbar", async () => {
    const mod = await import("../src/lib/supervisor/auto-approve")
    assert(typeof mod.canAutoApprove === "function", "canAutoApprove fehlt")
  })

  await test("types importierbar", async () => {
    await import("../src/lib/supervisor/types")
  })

  await test("decision-engine importierbar", async () => {
    const mod = await import("../src/lib/supervisor/decision-engine")
    assert(typeof mod.decideSupervisorAction === "function", "decideSupervisorAction fehlt")
  })

  await test("supervisor-runtime importierbar", async () => {
    const mod = await import("../src/lib/supervisor/supervisor-runtime")
    assert(typeof mod.runSupervisor === "function", "runSupervisor fehlt")
  })

  await test("triggers/reactive importierbar", async () => {
    const mod = await import("../src/lib/supervisor/triggers/reactive")
    assert(typeof mod.checkReactiveTriggers === "function", "checkReactiveTriggers fehlt")
  })

  await test("triggers/periodic importierbar", async () => {
    const mod = await import("../src/lib/supervisor/triggers/periodic")
    assert(typeof mod.runPeriodicAudit === "function", "runPeriodicAudit fehlt")
  })

  await test("executors/index importierbar", async () => {
    const mod = await import("../src/lib/supervisor/executors/index")
    assert(typeof mod.executeAction === "function", "executeAction fehlt")
  })

  await test("escalate_to_supervisor tool importierbar", async () => {
    const mod = await import("../src/lib/tools/definitions/escalate_to_supervisor")
    assert(typeof mod.escalateToSupervisorTool === "object", "escalateToSupervisorTool fehlt")
    assert(mod.escalateToSupervisorTool.name === "escalate_to_supervisor", "Tool-Name falsch")
    assert(typeof mod.escalateToSupervisorTool.execute === "function", "execute fehlt")
  })

  await test("admin-notifier importierbar", async () => {
    const mod = await import("../src/lib/admin-notifier/admin-notifier")
    assert(typeof mod.sendAdminNotification === "function", "sendAdminNotification fehlt")
    assert(typeof mod.updateNotificationMessage === "function", "updateNotificationMessage fehlt")
    assert(typeof mod.getProviderForUser === "function", "getProviderForUser fehlt")
  })

  // ── Template Tests ─────────────────────────────────────────────────────────

  console.log("\n=== Templates ===\n")

  await test("renderApprovalRequest() erzeugt Text mit Action-Details", async () => {
    const { renderApprovalRequest, approvalInlineKeyboard } = await import(
      "../src/lib/admin-notifier/templates/approval-request"
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockAction: any = {
      id:             "test-action-id",
      urgency:        "HIGH",
      proposedAction: "PAUSE_LEAD",
      triggerType:    "AGENT_STUCK",
      reasoning:      "Agent hat 3x hintereinander versagt",
      actionParams:   {},
      status:         "PENDING_ADMIN",
      boardId:        "board-123",
    }

    const text = renderApprovalRequest(mockAction)
    assert(text.includes("AGENT_STUCK") || text.includes("test-action-id"), "Trigger/ID sollte im Text stehen")

    const keyboard = approvalInlineKeyboard("test-action-id")
    assert(Array.isArray(keyboard.inline_keyboard), "inline_keyboard fehlt")
    const buttons = keyboard.inline_keyboard[0]
    assert(buttons.length === 2, "Sollte 2 Buttons haben")
    assert(buttons[0].callback_data === "approve:test-action-id", "Approve-Callback falsch")
    assert(buttons[1].callback_data === "reject:test-action-id", "Reject-Callback falsch")
  })

  await test("renderActionExecuted() erzeugt Status-Text", async () => {
    const { renderActionExecuted } = await import(
      "../src/lib/admin-notifier/templates/action-executed"
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockAction: any = {
      id:             "test-action-id",
      status:         "APPROVED",
      proposedAction: "RESET_STATE",
      boardId:        "board-123",
      approverUserId: "user-123",
      rejectReason:   null,
      executionError: null,
    }

    const text = renderActionExecuted(mockAction)
    assert(text.includes("APPROVED") || text.includes("✅"), "Approved-Status fehlt im Text")
  })

  await test("renderPeriodicReport() erzeugt Statistik-Text", async () => {
    const { renderPeriodicReport } = await import(
      "../src/lib/admin-notifier/templates/periodic-report"
    )

    const text = renderPeriodicReport({
      period:                   "4h",
      totalAgentRuns:           42,
      failedRuns:               2,
      blockedHandoffs:          5,
      escalations:              1,
      pendingSupervisorActions: 3,
    })

    assert(text.includes("42"), "totalAgentRuns fehlt")
    assert(text.includes("2"),  "failedRuns fehlt")
    assert(text.includes("⚠️") || text.includes("✅"), "Health-Emoji fehlt")
  })

  // ── Tool Execution Test ────────────────────────────────────────────────────

  console.log("\n=== Tool Execution ===\n")

  await test("escalate_to_supervisor.execute() gibt nextAction:'escalate' zurück", async () => {
    const { escalateToSupervisorTool } = await import(
      "../src/lib/tools/definitions/escalate_to_supervisor"
    )
    const result = await escalateToSupervisorTool.execute({ reason: "Test", urgency: "HIGH" })
    assert(result.nextAction === "escalate", `nextAction sollte 'escalate' sein, war: ${result.nextAction}`)
    assert(result.success === true, "success sollte true sein")
  })

  await test("canAutoApprove vollständiger Matrix-Test", async () => {
    const { canAutoApprove } = await import("../src/lib/supervisor/auto-approve")

    // Immer auto
    assert(canAutoApprove("NOTIFY_ONLY" as never,       []) === true,  "NOTIFY_ONLY → true")
    assert(canAutoApprove("UPDATE_LEAD_SCORE" as never, []) === true,  "UPDATE_LEAD_SCORE → true")

    // Niemals auto
    assert(canAutoApprove("KILL_CONVERSATION" as never, ["KILL_CONVERSATION" as never]) === false, "KILL_CONVERSATION → false")
    assert(canAutoApprove("RESET_STATE" as never,       ["RESET_STATE" as never])       === false, "RESET_STATE → false")
    assert(canAutoApprove("REASSIGN_TO_STATE" as never, ["REASSIGN_TO_STATE" as never]) === false, "REASSIGN_TO_STATE → false")
    assert(canAutoApprove("PAUSE_LEAD" as never,        ["PAUSE_LEAD" as never])        === false, "PAUSE_LEAD → false")
    assert(canAutoApprove("FORCE_HANDOFF" as never,     ["FORCE_HANDOFF" as never])     === false, "FORCE_HANDOFF → false")

    // Konfigurierbar
    assert(canAutoApprove("RESUME_LEAD" as never, [])                             === false, "RESUME_LEAD ohne Config → false")
    assert(canAutoApprove("RESUME_LEAD" as never, ["RESUME_LEAD" as never])       === true,  "RESUME_LEAD mit Config → true")
    assert(canAutoApprove("REQUEST_HUMAN_TAKEOVER" as never, [])                  === false, "REQUEST_HUMAN_TAKEOVER ohne Config → false")
    assert(canAutoApprove("REQUEST_HUMAN_TAKEOVER" as never, ["REQUEST_HUMAN_TAKEOVER" as never]) === true, "REQUEST_HUMAN_TAKEOVER mit Config → true")
  })

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`)
  if (failed > 0) {
    console.error("Smoke-Tests fehlgeschlagen.")
    process.exit(1)
  } else {
    console.log("Alle Smoke-Tests bestanden ✓")
  }
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err)
  process.exit(1)
})
