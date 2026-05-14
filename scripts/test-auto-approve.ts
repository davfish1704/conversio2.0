/**
 * Unit-Tests für auto-approve.ts
 * Keine DB-Verbindung erforderlich.
 *
 * Ausführen: npx tsx scripts/test-auto-approve.ts
 */

let passed = 0
let failed = 0

function test(label: string, fn: () => void): void {
  try {
    fn()
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
  const { canAutoApprove } = await import("../src/lib/supervisor/auto-approve")

  console.log("\n=== canAutoApprove() ===\n")

  test("NOTIFY_ONLY ist immer auto-approvable", () => {
    assert(canAutoApprove("NOTIFY_ONLY", []) === true, "NOTIFY_ONLY sollte true sein")
  })

  test("UPDATE_LEAD_SCORE ist immer auto-approvable", () => {
    assert(canAutoApprove("UPDATE_LEAD_SCORE", []) === true, "UPDATE_LEAD_SCORE sollte true sein")
  })

  test("KILL_CONVERSATION ist niemals auto-approvable", () => {
    assert(canAutoApprove("KILL_CONVERSATION", ["KILL_CONVERSATION"]) === false,
      "KILL_CONVERSATION sollte false sein — auch wenn in State-Liste")
  })

  test("RESET_STATE ist niemals auto-approvable", () => {
    assert(canAutoApprove("RESET_STATE", ["RESET_STATE"]) === false,
      "RESET_STATE sollte false sein")
  })

  test("REASSIGN_TO_STATE ist niemals auto-approvable", () => {
    assert(canAutoApprove("REASSIGN_TO_STATE", ["REASSIGN_TO_STATE"]) === false,
      "REASSIGN_TO_STATE sollte false sein")
  })

  test("PAUSE_LEAD ist niemals auto-approvable", () => {
    assert(canAutoApprove("PAUSE_LEAD", ["PAUSE_LEAD"]) === false,
      "PAUSE_LEAD sollte false sein")
  })

  test("FORCE_HANDOFF ist niemals auto-approvable", () => {
    assert(canAutoApprove("FORCE_HANDOFF", ["FORCE_HANDOFF"]) === false,
      "FORCE_HANDOFF sollte false sein")
  })

  test("RESUME_LEAD: false ohne State-Konfiguration", () => {
    assert(canAutoApprove("RESUME_LEAD", []) === false,
      "RESUME_LEAD ohne Konfiguration sollte false sein")
  })

  test("RESUME_LEAD: true wenn in State.autoApproveActions", () => {
    assert(canAutoApprove("RESUME_LEAD", ["RESUME_LEAD"]) === true,
      "RESUME_LEAD sollte true sein wenn in der State-Liste")
  })

  test("REQUEST_HUMAN_TAKEOVER: false ohne State-Konfiguration", () => {
    assert(canAutoApprove("REQUEST_HUMAN_TAKEOVER", []) === false,
      "REQUEST_HUMAN_TAKEOVER ohne Konfiguration sollte false sein")
  })

  test("REQUEST_HUMAN_TAKEOVER: true wenn in State.autoApproveActions", () => {
    assert(canAutoApprove("REQUEST_HUMAN_TAKEOVER", ["REQUEST_HUMAN_TAKEOVER"]) === true,
      "REQUEST_HUMAN_TAKEOVER sollte true sein wenn in der State-Liste")
  })

  test("Mischung mehrerer Aktionen in autoApproveList", () => {
    const list = ["RESUME_LEAD", "REQUEST_HUMAN_TAKEOVER"] as import("@prisma/client").SupervisorActionType[]
    assert(canAutoApprove("RESUME_LEAD", list) === true,  "RESUME_LEAD in Liste → true")
    assert(canAutoApprove("PAUSE_LEAD",  list) === false, "PAUSE_LEAD nicht in Liste → false")
  })

  console.log(`\n${"─".repeat(50)}`)
  console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`)
  if (failed > 0) {
    console.error("Tests fehlgeschlagen.")
    process.exit(1)
  } else {
    console.log("Alle Tests bestanden ✓")
  }
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err)
  process.exit(1)
})
