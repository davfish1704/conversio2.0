/**
 * Smoke-Test für Phase 1 Sub-Agent Foundation.
 * Prüft alle neuen Module auf Importierbarkeit und Grundfunktion.
 * Keine DB-Verbindung erforderlich.
 *
 * Ausführen: npx tsx scripts/smoke-test-runtime.ts
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

// ── Imports ────────────────────────────────────────────────────────────────────

async function main() {
console.log("\n=== Modul-Imports ===")

await test("handoff-engine importierbar", async () => {
  const mod = await import("../src/lib/agents/handoff-engine")
  assert(typeof mod.evaluateRule === "function", "evaluateRule fehlt")
  assert(typeof mod.evaluateHandoffRules === "function", "evaluateHandoffRules fehlt")
  assert(typeof mod.decideHandoff === "function", "decideHandoff fehlt")
  assert(typeof mod.loadHandoffContext === "function", "loadHandoffContext fehlt")
})

await test("sub-agent-prompt-builder importierbar", async () => {
  const mod = await import("../src/lib/agents/sub-agent-prompt-builder")
  assert(typeof mod.buildSubAgentSystemPrompt === "function", "buildSubAgentSystemPrompt fehlt")
})

await test("sub-agent-runtime importierbar", async () => {
  const mod = await import("../src/lib/agents/sub-agent-runtime")
  assert(typeof mod.executeSubAgentRun === "function", "executeSubAgentRun fehlt")
})

await test("seed-templates/insurance importierbar", async () => {
  const mod = await import("../prisma/seed-templates/insurance")
  assert(mod.insuranceTemplate.states.length > 0, "keine States im insurance-Template")
})

await test("seed-templates/real-estate importierbar", async () => {
  const mod = await import("../prisma/seed-templates/real-estate")
  assert(mod.realEstateTemplate.states.length > 0, "keine States im real-estate-Template")
})

await test("seed-templates/generic-funnel importierbar", async () => {
  const mod = await import("../prisma/seed-templates/generic-funnel")
  assert(mod.genericFunnelTemplate.states.length > 0, "keine States im generic-funnel-Template")
})

// ── Prompt Builder ─────────────────────────────────────────────────────────────

console.log("\n=== buildSubAgentSystemPrompt() ===")

await test("Prompt mit Sub-Agent-Feldern wird korrekt aufgebaut", async () => {
  const { buildSubAgentSystemPrompt } = await import("../src/lib/agents/sub-agent-prompt-builder")

  const result = buildSubAgentSystemPrompt({
    agentRole:         "Du bist ein Versicherungsberater.",
    agentGoal:         "Erfasse die Versicherungsart des Leads.",
    agentSystemPrompt: "Stelle maximal eine Frage auf einmal.",
    handoffMode:       "HYBRID",
    stateName:         "Erstqualifizierung",
    stateMission:      null,
    stateRules:        null,
    dataToCollect:     ["insurance_type"],
    brain: {
      systemPrompt: "",
      stylePrompt:  "Professionell und freundlich",
      infoPrompt:   "",
      rulePrompt:   "",
      language:     "de",
      tone:         "friendly",
    },
    knowledge:           { rules: [], faqs: [], docs: [] },
    memories:            [{ key: "name", value: "Klaus Müller" }],
    conversationSummary: null,
    channel:             "whatsapp",
    leadChannels:        ["whatsapp"],
    customData:          { insurance_interest: "KFZ" },
    language:            "de",
  })

  assert(result.includes("Versicherungsberater"), "agentRole nicht im Prompt")
  assert(result.includes("Erfasse die Versicherungsart"), "agentGoal nicht im Prompt")
  assert(result.includes("Erstqualifizierung"), "stateName nicht im Prompt")
  assert(result.includes("Klaus Müller"), "Memory nicht im Prompt")
  assert(result.includes("insurance_type"), "dataToCollect nicht im Prompt")
  assert(result.includes("handoff_proposed"), "Handoff-Hinweis fehlt")
  assert(result.length > 200, "Prompt zu kurz")
})

await test("Prompt ohne Sub-Agent-Felder fällt auf brain.systemPrompt zurück", async () => {
  const { buildSubAgentSystemPrompt } = await import("../src/lib/agents/sub-agent-prompt-builder")

  const result = buildSubAgentSystemPrompt({
    agentRole:         null,
    agentGoal:         null,
    agentSystemPrompt: null,
    handoffMode:       "LLM_ONLY",
    stateName:         "Test State",
    stateMission:      "Teste den Lead",
    stateRules:        "Sei freundlich",
    dataToCollect:     [],
    brain: {
      systemPrompt: "Du bist ein allgemeiner Assistent.",
      stylePrompt:  "",
      infoPrompt:   "",
      rulePrompt:   "",
      language:     "de",
      tone:         "neutral",
    },
    knowledge:           { rules: [], faqs: [], docs: [] },
    memories:            [],
    conversationSummary: null,
    channel:             "telegram",
    leadChannels:        [],
    customData:          {},
  })

  assert(result.includes("allgemeiner Assistent"), "brain.systemPrompt nicht im Prompt")
  assert(result.includes("Teste den Lead"), "stateMission nicht im Prompt")
  assert(result.includes("Sei freundlich"), "stateRules nicht im Prompt")
})

// ── Handoff Engine ─────────────────────────────────────────────────────────────

console.log("\n=== Handoff Engine (Integrations-Smoke) ===")

await test("evaluateHandoffRules + decideHandoff — vollständiger Pfad HYBRID PASS", async () => {
  const { evaluateHandoffRules, decideHandoff } = await import("../src/lib/agents/handoff-engine")

  const ctx = { leadCustomData: { name: "Anna", email: "anna@test.de" }, leadScore: 60, messageCount: 5 }
  const rules = [
    { type: "field_collected" as const, field: "name", operator: "exists" as const },
    { type: "lead_score" as const, operator: "gte" as const, value: 50 },
  ]
  const rulesEval = evaluateHandoffRules(rules, ctx)
  assert(rulesEval.allPassed === true, "Regeln sollten alle bestehen")

  const decision = decideHandoff({ mode: "HYBRID", agentProposed: true, agentConfidence: 0.8, minConfidence: 0.7, rulesEval })
  assert(decision.approved === true, `HYBRID sollte genehmigt sein: ${decision.reason}`)
})

await test("RULE_ONLY — Regeln fehlgeschlagen blockiert auch bei hoher Konfidenz", async () => {
  const { evaluateHandoffRules, decideHandoff } = await import("../src/lib/agents/handoff-engine")

  const ctx = { leadCustomData: {}, leadScore: 0, messageCount: 1 }
  const rules = [{ type: "field_collected" as const, field: "email", operator: "exists" as const }]
  const rulesEval = evaluateHandoffRules(rules, ctx)
  assert(rulesEval.allPassed === false, "Regeln sollten fehlschlagen")

  const decision = decideHandoff({ mode: "RULE_ONLY", agentProposed: true, agentConfidence: 0.99, minConfidence: 0.5, rulesEval })
  assert(decision.approved === false, "RULE_ONLY + failed rules = kein Handoff")
})

// ── Template Struktur ─────────────────────────────────────────────────────────

console.log("\n=== Template Struktur ===")

await test("Alle Template-States haben Pflichtfelder", async () => {
  const templates = await Promise.all([
    import("../prisma/seed-templates/insurance").then((m) => m.insuranceTemplate),
    import("../prisma/seed-templates/real-estate").then((m) => m.realEstateTemplate),
    import("../prisma/seed-templates/generic-funnel").then((m) => m.genericFunnelTemplate),
  ])

  for (const tmpl of templates) {
    for (const state of tmpl.states) {
      assert(typeof state.name === "string" && state.name.length > 0, `State name fehlt in ${tmpl.name}`)
      assert(typeof state.type === "string", `State type fehlt: ${state.name}`)
      assert(typeof state.orderIndex === "number", `orderIndex fehlt: ${state.name}`)
    }
  }
})

await test("AI-States in Templates haben agentRole oder mission", async () => {
  const templates = await Promise.all([
    import("../prisma/seed-templates/insurance").then((m) => m.insuranceTemplate),
    import("../prisma/seed-templates/real-estate").then((m) => m.realEstateTemplate),
    import("../prisma/seed-templates/generic-funnel").then((m) => m.genericFunnelTemplate),
  ])

  for (const tmpl of templates) {
    for (const state of tmpl.states) {
      if (state.type === "AI") {
        const hasRole = !!state.agentRole || !!state.mission
        assert(hasRole, `AI-State "${state.name}" in "${tmpl.name}" hat weder agentRole noch mission`)
      }
    }
  }
})

await test("nextStateName-Links in Templates sind valide", async () => {
  const templates = await Promise.all([
    import("../prisma/seed-templates/insurance").then((m) => m.insuranceTemplate),
    import("../prisma/seed-templates/real-estate").then((m) => m.realEstateTemplate),
    import("../prisma/seed-templates/generic-funnel").then((m) => m.genericFunnelTemplate),
  ])

  for (const tmpl of templates) {
    const names = new Set(tmpl.states.map((s) => s.name))
    for (const state of tmpl.states) {
      if (state.nextStateName) {
        assert(names.has(state.nextStateName), `"${state.name}" verweist auf unbekannten State: "${state.nextStateName}" (${tmpl.name})`)
      }
    }
  }
})

// ── Summary ────────────────────────────────────────────────────────────────────

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
