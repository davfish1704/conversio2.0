# Phase 2 — Supervisor Agent + Admin Approval: Abschlussbericht

**Datum:** 2026-05-14  
**Status:** ✅ Vollständig abgeschlossen

---

## Zusammenfassung

Conversio 2.0 hat jetzt einen Supervisor-Agent-Layer über der Sub-Agent-Foundation (Phase 1). Der Supervisor erkennt fehlerhafte Conversations, entscheidet per LLM welche Korrektur-Aktion notwendig ist, und holt per Telegram-Inline-Button Admin-Approval ein — bevor er handelt.

---

## Was sich geändert hat

### Schema (Phase 2A)

| Änderung | Detail |
|----------|--------|
| `User` Model | +4 Felder: `adminChannel`, `adminTelegramChatId`, `adminWhatsappNumber`, `isSuperAdmin` |
| Neues Enum `AdminChannel` | `TELEGRAM \| WHATSAPP \| EMAIL` |
| `State` Model | +`autoApproveActions SupervisorActionType[]` |
| `AdminNotification` Model | +`channel`, `recipientId`, `supervisorActionId` + Relation |
| `Board`, `Lead`, `Conversation` | Je `supervisorActions SupervisorAction[]` Relation |
| Neues Model `SupervisorAction` | Vollständiger Trigger/Decision/Approval/Execution-Record |
| 4 neue Enums | `SupervisorTriggerType`, `SupervisorActionType`, `SupervisorUrgency`, `ApprovalStatus` |

### Neue Dateien (Phase 2A–2D)

```
src/lib/admin-notifier/
  types.ts                          — Interfaces für Provider-System
  admin-notifier.ts                 — sendAdminNotification(), updateNotificationMessage()
  providers/telegram-provider.ts    — Telegram Admin Bot: send() + updateMessage()
  providers/whatsapp-provider.ts    — STUB
  providers/email-provider.ts       — STUB
  templates/approval-request.ts     — renderApprovalRequest() + approvalInlineKeyboard()
  templates/action-executed.ts      — renderActionExecuted()
  templates/periodic-report.ts      — renderPeriodicReport()

src/lib/supervisor/
  types.ts                          — SupervisorInput, SupervisorDecision
  decision-engine.ts                — decideSupervisorAction() via LLM + Fallback
  auto-approve.ts                   — canAutoApprove() Logik
  supervisor-runtime.ts             — runSupervisor() Haupt-Entry
  triggers/reactive.ts              — checkReactiveTriggers() — 3 Trigger-Typen
  triggers/periodic.ts              — runPeriodicAudit() — Board-aggregiert
  executors/index.ts                — executeAction() Dispatcher
  executors/reset-state.ts          — State re-entry
  executors/reassign-to-state.ts    — Anderen State zuweisen
  executors/pause-lead.ts           — conversation.frozen = true
  executors/resume-lead.ts          — conversation.frozen = false
  executors/force-handoff.ts        — Handoff erzwingen
  executors/kill-conversation.ts    — status = ARCHIVED
  executors/update-lead-score.ts    — leadScore increment
  executors/notify-only.ts          — No-op

src/app/api/admin/telegram/webhook/route.ts — Admin Bot Webhook
src/app/api/cron/supervisor-audit/route.ts  — Periodischer Audit

scripts/
  setup-admin-telegram.ts           — Admin Bot Setup CLI
  test-auto-approve.ts              — 12 Unit-Tests (canAutoApprove)
  test-supervisor-flow.ts           — 14 Smoke-Tests (alle Phase-2-Module)
```

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | +SupervisorAction Model, +User Admin-Felder, +State.autoApproveActions, +AdminNotification.supervisorActionId |
| `src/lib/jobs/enqueue.ts` | `"supervisor_execute"` zu JobType hinzugefügt |
| `src/lib/jobs/runner.ts` | Case `supervisor_execute` → `executeAction()` |
| `src/lib/tools/index.ts` | `escalateToSupervisorTool` registriert |
| `src/lib/agents/sub-agent-runtime.ts` | `ALWAYS_ON_TOOLS` + Step 13 Reactive Trigger Hook |
| `vercel.json` | Neuer Cron: `supervisor-audit` alle 4h |
| `.env.example` | `ADMIN_TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_WEBHOOK_SECRET` |

---

## Architektur: Supervisor-Flow

```
Sub-Agent liefert Outcome
        │
        ▼
checkReactiveTriggers()  ← fire-and-forget nach Step 12
        │
        ├─ ESCALATED              → ESCALATION_REQUESTED trigger
        ├─ LLM_ERROR (3x)         → AGENT_STUCK trigger
        ├─ HANDOFF_BLOCKED (≥3x)  → HANDOFF_REPEATEDLY_BLOCKED trigger
        │
        ▼
runSupervisor()
        │
        ├─ Context laden (Conversation + letzte 10 AgentRuns)
        ├─ decideSupervisorAction() via LLM
        ├─ SupervisorAction.create() (PENDING_ADMIN)
        │
        ├─ canAutoApprove()? ─── ja ──→ executeAction() direkt
        │                                (status: AUTO_APPROVED → EXECUTED)
        │
        └─ nein ──→ sendAdminNotification() mit Inline-Buttons
                           │
                    Telegram-Nachricht an Admin
                           │
               Admin drückt ✅ oder ❌
                           │
               /api/admin/telegram/webhook
                           │
               ├─ ✅ → status: APPROVED → enqueueJob("supervisor_execute")
               │         → executeAction() → status: EXECUTED
               │
               └─ ❌ → status: REJECTED → Buttons entfernt
```

---

## Auto-Approve Matrix

| Aktion | Auto-Approve |
|--------|-------------|
| `NOTIFY_ONLY` | ✅ Immer |
| `UPDATE_LEAD_SCORE` | ✅ Immer |
| `KILL_CONVERSATION` | ❌ Niemals |
| `RESET_STATE` | ❌ Niemals |
| `REASSIGN_TO_STATE` | ❌ Niemals |
| `PAUSE_LEAD` | ❌ Niemals |
| `FORCE_HANDOFF` | ❌ Niemals |
| `RESUME_LEAD` | ⚙️ Wenn in `State.autoApproveActions` |
| `REQUEST_HUMAN_TAKEOVER` | ⚙️ Wenn in `State.autoApproveActions` |

---

## Einrichtung (einmalig pro Deployment)

```bash
# 1. Admin Telegram Bot erstellen (@BotFather → /newbot)
# 2. ENV-Vars in Vercel/Neon setzen:
#    ADMIN_TELEGRAM_BOT_TOKEN=<token>
#    ADMIN_TELEGRAM_WEBHOOK_SECRET=<random-string>

# 3. Admin-User einrichten (Bot starten → /start → Chat-ID aus @userinfobot):
npx tsx scripts/setup-admin-telegram.ts \
  --email info@trsales.net \
  --chat-id <telegram-chat-id>
```

---

## Test-Ergebnisse

```
scripts/test-auto-approve.ts      → 12/12 Tests bestanden ✓
scripts/test-supervisor-flow.ts   → 14/14 Tests bestanden ✓
npx tsc --noEmit                  → 0 Fehler ✓
npx prisma validate               → Schema valid ✓
```

---

## Nächste Schritte (Phase 3 — UI)

- **Phase 3A:** SupervisorAction-Dashboard im Admin-Bereich (offene + vergangene Aktionen)
- **Phase 3B:** State-Editor: `autoApproveActions[]` konfigurierbar
- **Phase 3C:** AgentRun-Timeline pro Conversation (mit Supervisor-Trigger-Markierungen)
- **Phase 3D:** Board-Health-Score aus Supervisor-Daten
