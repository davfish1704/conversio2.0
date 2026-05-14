/**
 * Unit-Tests für den Handoff-Engine (keine DB-Verbindung nötig).
 * Ausführen: npx tsx scripts/test-handoff-engine.ts
 */

import {
  evaluateRule,
  evaluateHandoffRules,
  decideHandoff,
  type HandoffContext,
  type HandoffRule,
} from "../src/lib/agents/handoff-engine"

// ── Test Helpers ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function test(label: string, fn: () => void) {
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ctx: HandoffContext = {
  leadCustomData: { name: "Klaus Müller", email: "k.mueller@example.de", phone: "" },
  leadScore: 65,
  messageCount: 8,
}

const emptyCtx: HandoffContext = {
  leadCustomData: {},
  leadScore: 0,
  messageCount: 1,
}

// ── Rule Evaluator Tests ───────────────────────────────────────────────────────

console.log("\n=== evaluateRule() ===")

test("field_collected / exists — Feld vorhanden", () => {
  const rule: HandoffRule = { type: "field_collected", field: "name", operator: "exists" }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === true, `erwartet true, bekam ${result.passed}`)
})

test("field_collected / exists — leeres Feld zählt als nicht vorhanden", () => {
  const rule: HandoffRule = { type: "field_collected", field: "phone", operator: "exists" }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === false, `erwartet false (leerer String), bekam ${result.passed}`)
})

test("field_collected / not_exists — Feld fehlt", () => {
  const rule: HandoffRule = { type: "field_collected", field: "age", operator: "not_exists" }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === true, `erwartet true, bekam ${result.passed}`)
})

test("field_collected / not_exists — Feld vorhanden, schlägt fehl", () => {
  const rule: HandoffRule = { type: "field_collected", field: "name", operator: "not_exists" }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === false, `erwartet false, bekam ${result.passed}`)
})

test("custom_data / eq — Wert stimmt überein", () => {
  const rule: HandoffRule = { type: "custom_data", field: "email", operator: "eq", value: "k.mueller@example.de" }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === true, `erwartet true, bekam ${result.passed}`)
})

test("custom_data / contains — Teilstring", () => {
  const rule: HandoffRule = { type: "custom_data", field: "name", operator: "contains", value: "Müller" }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === true, `erwartet true, bekam ${result.passed}`)
})

test("lead_score / gte — Score über Schwelle", () => {
  const rule: HandoffRule = { type: "lead_score", operator: "gte", value: 50 }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === true, `erwartet true (score 65 >= 50), bekam ${result.passed}`)
})

test("lead_score / gte — Score unter Schwelle", () => {
  const rule: HandoffRule = { type: "lead_score", operator: "gte", value: 80 }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === false, `erwartet false (score 65 < 80), bekam ${result.passed}`)
})

test("message_count / gte — genug Nachrichten", () => {
  const rule: HandoffRule = { type: "message_count", operator: "gte", value: 5 }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === true, `erwartet true (8 >= 5), bekam ${result.passed}`)
})

test("message_count / lt — zu viele Nachrichten", () => {
  const rule: HandoffRule = { type: "message_count", operator: "lt", value: 5 }
  const result = evaluateRule(rule, ctx)
  assert(result.passed === false, `erwartet false (8 nicht < 5), bekam ${result.passed}`)
})

test("unbekannter Typ gibt false zurück", () => {
  const rule = { type: "magic_rule", operator: "exists" } as unknown as HandoffRule
  const result = evaluateRule(rule, ctx)
  assert(result.passed === false, "unbekannter Typ sollte false liefern")
})

// ── evaluateHandoffRules() Tests ──────────────────────────────────────────────

console.log("\n=== evaluateHandoffRules() ===")

test("Leere Regeln → allPassed = true", () => {
  const result = evaluateHandoffRules([], ctx)
  assert(result.allPassed === true, "keine Regeln = immer passed")
  assert(result.totalCount === 0, "totalCount sollte 0 sein")
})

test("Ungültiges JSON → leere Regeln → allPassed = true", () => {
  const result = evaluateHandoffRules("invalid_string", ctx)
  assert(result.allPassed === true, "ungültiges JSON = keine Regeln = passed")
})

test("Alle Regeln bestanden", () => {
  const rules: HandoffRule[] = [
    { type: "field_collected", field: "name", operator: "exists" },
    { type: "lead_score", operator: "gte", value: 50 },
    { type: "message_count", operator: "gte", value: 5 },
  ]
  const result = evaluateHandoffRules(rules, ctx)
  assert(result.allPassed === true, "alle sollten bestehen")
  assert(result.passedCount === 3, `erwartet 3 bestanden, bekam ${result.passedCount}`)
})

test("Eine Regel schlägt fehl → allPassed = false", () => {
  const rules: HandoffRule[] = [
    { type: "field_collected", field: "name", operator: "exists" },
    { type: "field_collected", field: "phone", operator: "exists" }, // leeres phone = fail
  ]
  const result = evaluateHandoffRules(rules, ctx)
  assert(result.allPassed === false, "phone-Regel sollte fehlschlagen")
  assert(result.passedCount === 1, `erwartet 1 bestanden, bekam ${result.passedCount}`)
})

// ── decideHandoff() Tests ─────────────────────────────────────────────────────

console.log("\n=== decideHandoff() ===")

const passedRules = evaluateHandoffRules([{ type: "lead_score", operator: "gte", value: 50 }], ctx)
const failedRules = evaluateHandoffRules([{ type: "lead_score", operator: "gte", value: 90 }], ctx)

test("LLM_ONLY — Agent schlägt vor + Konfidenz OK → genehmigt", () => {
  const decision = decideHandoff({ mode: "LLM_ONLY", agentProposed: true, agentConfidence: 0.85, minConfidence: 0.7, rulesEval: failedRules })
  assert(decision.approved === true, `erwartet true, bekam ${decision.approved}: ${decision.reason}`)
  assert(decision.rulesPassed === null, "LLM_ONLY sollte rulesPassed null lassen")
})

test("LLM_ONLY — Agent schlägt vor + Konfidenz zu niedrig → abgelehnt", () => {
  const decision = decideHandoff({ mode: "LLM_ONLY", agentProposed: true, agentConfidence: 0.5, minConfidence: 0.7, rulesEval: passedRules })
  assert(decision.approved === false, `erwartet false, bekam ${decision.approved}`)
})

test("LLM_ONLY — Agent schlägt nicht vor → abgelehnt", () => {
  const decision = decideHandoff({ mode: "LLM_ONLY", agentProposed: false, agentConfidence: null, minConfidence: 0.7, rulesEval: passedRules })
  assert(decision.approved === false, "kein Vorschlag = kein Handoff")
})

test("RULE_ONLY — Regeln bestanden → genehmigt (egal ob Agent vorschlägt)", () => {
  const decision = decideHandoff({ mode: "RULE_ONLY", agentProposed: false, agentConfidence: null, minConfidence: 0.7, rulesEval: passedRules })
  assert(decision.approved === true, `RULE_ONLY + passed rules sollte true sein: ${decision.reason}`)
  assert(decision.confidencePassed === null, "RULE_ONLY ignoriert Konfidenz")
})

test("RULE_ONLY — Regeln fehlgeschlagen → abgelehnt", () => {
  const decision = decideHandoff({ mode: "RULE_ONLY", agentProposed: true, agentConfidence: 0.99, minConfidence: 0.7, rulesEval: failedRules })
  assert(decision.approved === false, "RULE_ONLY + failed rules = kein Handoff")
})

test("HYBRID — Agent + Regeln + Konfidenz alle OK → genehmigt", () => {
  const decision = decideHandoff({ mode: "HYBRID", agentProposed: true, agentConfidence: 0.9, minConfidence: 0.7, rulesEval: passedRules })
  assert(decision.approved === true, `HYBRID sollte true sein: ${decision.reason}`)
})

test("HYBRID — Agent schlägt vor, Regeln fehlgeschlagen → abgelehnt", () => {
  const decision = decideHandoff({ mode: "HYBRID", agentProposed: true, agentConfidence: 0.9, minConfidence: 0.7, rulesEval: failedRules })
  assert(decision.approved === false, `HYBRID + failed rules = abgelehnt: ${decision.reason}`)
  assert(decision.rulesPassed === false, "rulesPassed sollte false sein")
})

test("HYBRID — Regeln OK, Konfidenz zu niedrig → abgelehnt", () => {
  const decision = decideHandoff({ mode: "HYBRID", agentProposed: true, agentConfidence: 0.4, minConfidence: 0.7, rulesEval: passedRules })
  assert(decision.approved === false, "HYBRID + low confidence = abgelehnt")
})

test("HYBRID — Agent schlägt nicht vor → abgelehnt unabhängig von Regeln", () => {
  const decision = decideHandoff({ mode: "HYBRID", agentProposed: false, agentConfidence: null, minConfidence: 0.7, rulesEval: passedRules })
  assert(decision.approved === false, "HYBRID ohne Agent-Vorschlag = kein Handoff")
})

// ── Zusammenfassung ────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`)
console.log(`Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen`)
if (failed > 0) {
  console.error("Tests fehlgeschlagen.")
  process.exit(1)
} else {
  console.log("Alle Tests bestanden ✓")
}
