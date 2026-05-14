# Phase 1 — Sub-Agent Foundation: Abschlussbericht

**Datum:** 2026-05-14  
**Status:** ✅ Vollständig abgeschlossen

---

## Zusammenfassung

Conversio 2.0 wurde von einer Single-Agent-per-Board-Architektur zu einer Multi-Agent-Architektur umgebaut. Jeder **State ist jetzt ein eigenständiger Sub-Agent** mit eigenem System-Prompt, Ziel, Tool-Set und Handoff-Logik. Die Implementierung erfolgte in 4 Sub-Phasen (1A–1D).

---

## Was sich geändert hat

### Datenbank (Phase 1A)

| Änderung | Detail |
|----------|--------|
| `State` Model | +7 neue Felder: `agentRole`, `agentSystemPrompt`, `agentGoal`, `handoffMode`, `handoffRules`, `minAgentConfidence`, `nextStateOnFail` |
| Neues Model `AgentRun` | Vollständiger Audit-Record für jeden LLM-Call (Prompt, Tokens, Cost, Handoff-Entscheidung, Outcome) |
| Neues Enum `HandoffMode` | `LLM_ONLY \| RULE_ONLY \| HYBRID` |
| Neues Enum `AgentRunOutcome` | `SUCCESS_CONTINUE \| SUCCESS_HANDOFF \| HANDOFF_BLOCKED \| TOOL_EXECUTION_FAILED \| LLM_ERROR \| ESCALATED` |
| `AdminNotification` | Komplett ersetzt: `type/body/read` → `level/message/metadata/acknowledgedAt/acknowledgedBy` |
| Neues Enum `NotificationLevel` | `INFO \| WARNING \| ERROR \| CRITICAL` |
| Migration | `20260514000000_initial_sub_agent_foundation` |

### Neue Dateien (Phase 1B–1D)

```
src/lib/agents/
  sub-agent-prompt-builder.ts   — 7-Section-System-Prompt-Builder
  sub-agent-runtime.ts          — Kanonischer Execution-Path (ersetzt orchestration/)
  handoff-engine.ts             — Regelbasierte Handoff-Evaluierung

prisma/seed-templates/
  types.ts                      — StateTemplate / BoardTemplate Typen
  insurance.ts                  — Versicherungsmakler Pipeline (4 States)
  real-estate.ts                — Immobilienmakler Pipeline (4 States)
  generic-funnel.ts             — Generischer Lead-Funnel (4 States)

scripts/
  seed-templates.ts             — Seed-CLI für State-Templates
  test-handoff-engine.ts        — 24 Unit-Tests (handoff-engine)
  smoke-test-runtime.ts         — 13 Smoke-Tests (alle neuen Module)
```

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/state-machine/executor.ts` | `orchestrate()` → `executeSubAgentRun()` |
| `src/lib/notifications/admin-notify.ts` | Neues Schema, Telegram-Level-Emojis |
| `src/app/api/admin/notifications/route.ts` | `read/type/body` → `acknowledgedAt/level/message` |
| `src/app/api/cron/check-stuck-leads/route.ts` | Neues NotificationLevel-Schema |
| `src/lib/jobs/runner.ts` | notifyAdmin-Call auf neues Schema migriert |
| `src/lib/tools/index.ts` | `handoff_proposed` Tool registriert |
| `src/lib/tools/definitions/handoff_proposed.ts` | Neu: Signal-Only Handoff-Tool |
| `src/app/api/boards/[id]/brain/simulate/route.ts` | `runAgentLoop` → `buildSubAgentSystemPrompt + aiRegistry` |

### Gelöschte Dateien

| Datei | Grund |
|-------|-------|
| `src/lib/orchestration/index.ts` | Ersetzt durch `sub-agent-runtime.ts` |
| `src/lib/ai/tool-engine.ts` | Ersetzt durch `sub-agent-runtime.ts` |

---

## Behobene Bugs

| Bug | Beschreibung | Fix |
|-----|-------------|-----|
| **UsageLog nie geschrieben** | `orchestrate()` hat `aiRegistry.execute()` aufgerufen ohne UsageLog zu schreiben | `sub-agent-runtime.ts` schreibt nach **jedem** LLM-Call sofort ein `UsageLog` |
| **AdminNotification silent failures** | Alle Callers referenzierten veraltete Felder (`type`, `body`, `read`) | Alle Callers auf neues Schema migriert |
| **Bug 4: defaultModel Inkonsistenz** | Simulate-Route und brain-Route verwendeten verschiedene Modell-Defaults | Unified über `aiRegistry` Config |

---

## Architektur: Execution-Pfad nach Phase 1

```
Inbound Message
       │
       ▼
  job: process_message
       │
       ▼
  executeStateForConversation()
       │
       ├─ MESSAGE → direkter Text-Send
       ├─ TEMPLATE → Template-Send
       ├─ CONDITION → Keyword-Check → ggf. transition
       └─ AI ────────────────────────────────────────┐
                                                      ▼
                                          executeSubAgentRun()
                                                      │
                                          ┌───────────┴──────────┐
                                          │  buildSubAgentSystemPrompt()
                                          │  (7-Section-Hierachie)
                                          └───────────┬──────────┘
                                                      │
                                          ┌───────────┴──────────┐
                                          │  LLM-Call + Tool-Loop
                                          │  (max 5 Iterationen)
                                          │  → UsageLog nach jedem Call
                                          └───────────┬──────────┘
                                                      │
                                          ┌───────────┴──────────┐
                                          │  decideHandoff()
                                          │  (LLM_ONLY / RULE_ONLY / HYBRID)
                                          │  + evaluateHandoffRules()
                                          └───────────┬──────────┘
                                                      │
                                          ┌───────────┴──────────┐
                                          │  AgentRun persistieren
                                          │  (vollständiger Audit)
                                          └───────────┬──────────┘
                                                      │
                                          sendAIResponse() + updateMemory()
```

---

## Handoff-Engine: Regel-Schema

```typescript
// Beispiel handoffRules-Konfiguration für einen State
[
  { "type": "field_collected", "field": "email",    "operator": "exists" },
  { "type": "field_collected", "field": "phone",    "operator": "exists" },
  { "type": "lead_score",                           "operator": "gte",   "value": 50 },
  { "type": "message_count",                        "operator": "gte",   "value": 3 }
]
```

**Unterstützte Typen:** `field_collected`, `custom_data`, `message_count`, `lead_score`  
**Unterstützte Operatoren:** `exists`, `not_exists`, `eq`, `neq`, `gte`, `lte`, `gt`, `lt`, `contains`, `not_contains`

---

## Test-Ergebnisse

```
scripts/test-handoff-engine.ts    → 24/24 Tests bestanden ✓
scripts/smoke-test-runtime.ts     → 13/13 Tests bestanden ✓
npx tsc --noEmit                  → 0 Fehler ✓
```

---

## Seed-CLI Verwendung

```bash
# Versicherungsmakler Pipeline auf ein Board anwenden
npx tsx scripts/seed-templates.ts --template insurance --boardId <boardId>

# Immobilienmakler Pipeline (dry-run zur Vorschau)
npx tsx scripts/seed-templates.ts --template real-estate --boardId <boardId> --dry-run

# Bestehende States löschen + neu seeden
npx tsx scripts/seed-templates.ts --template generic --boardId <boardId> --clear
```

---

## Nächste Schritte (Phase 2)

- **Phase 2A:** UI für Sub-Agent-Konfiguration (State-Editor: agentRole, agentGoal, agentSystemPrompt, handoffRules)
- **Phase 2B:** AgentRun-Dashboard (Audit-Log pro Conversation)
- **Phase 2C:** Handoff-Monitoring (Blocked-Handoffs anzeigen, manuelle Override-Funktion)
- **Phase 2D:** Template-Picker im Board-Onboarding (Seed-CLI → UI-Workflow)
