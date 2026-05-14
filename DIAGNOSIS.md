# Production Diagnosis — 2026-05-15

**Status:** READ-ONLY. Keine Fixes.

---

## ZUSAMMENFASSUNG: 2 unabhängige Root Causes

| # | Problem | Root Cause |
|---|---------|-----------|
| 1 | `/api/admin/notifications` → P2022 `column "type" does not exist` | Vercel läuft mit altem Code (pre-Phase 1) — DB hat neue Schema-Felder, Code referenziert noch alte |
| 2 | AI antwortet nicht | Board "Vanessa Bali" hat **0 AI-type States** — alle 5 States sind type `MESSAGE` |

---

## DIAGNOSE 1: SCHEMA vs DATABASE STATE

### 1.1 Schema (lokal, prisma/schema.prisma)
AdminNotification hat **neue Felder**: `level`, `message`, `acknowledgedAt`, `acknowledgedBy`, `channel`, `recipientId`, `supervisorActionId`.  
**Keine alten Felder** `type`, `body`, `read` im Schema.

### 1.2 Migration Status
```
1 migration found in prisma/migrations
Database schema is up to date!
```
Migration: `20260514000000_initial_sub_agent_foundation`

### 1.3 Migrations Verzeichnis
```
prisma/migrations/
  20260514000000_initial_sub_agent_foundation/
```
Nur 1 Migration vorhanden. Phase 2A-Änderungen wurden via `prisma db push` eingespielt (kein Migration-File erstellt).

### 1.4 DB Pull (Live Neon)
AdminNotification in Neon hat **neue Felder** — übereinstimmend mit lokalem Schema.  
Felder `type`, `body`, `read` **existieren nicht mehr in der DB.**

### Schlussfolgerung
DB-Schema ist korrekt und aktuell. Das P2022-Problem liegt **nicht** in der DB, sondern im deployen Code auf Vercel.

---

## DIAGNOSE 2: VERCEL DEPLOYMENT STATE

### 2.1 Letzter Commit (= was auf Vercel deployed ist)
```
6d22423 feat: add restore-dev-state script for db reset recovery
b3b6563 fix: add 'use client' to not-found.tsx
049ba0c Deine Commit-Nachricht...
c220ce0 fix: DeepSeek API baseURL
eac778f fix: verify-email Suspense boundary
5ed5e3a feat: Webhook Protection
5d6f4f8 feat: Security — Board Isolation, Admin Guards, Rate Limiting
fea9d58 feat: Error Handling, Dead Letter Queue, Admin Notifications  ← ENTHÄLT ALTES SCHEMA
```

**Phase 1 und Phase 2 Code wurden NICHT committed und NICHT deployed.**

Der Commit `fea9d58` hat das originale AdminNotification-Schema eingeführt (`type`, `body`, `read`). Der Code auf Vercel referenziert diese Felder. Die DB hat diese Felder nach `prisma db push` nicht mehr → **P2022**.

### 2.2 Current Branch
```
main
```

### Code-Deploy-Gap (kritisch)
| Komponente | Zustand auf Vercel | Zustand lokal |
|-----------|-------------------|---------------|
| `AdminNotification` Schema-Code | Alt: `type`/`body`/`read` | Neu: `level`/`message`/`acknowledgedAt` |
| `sub-agent-runtime.ts` | ❌ Existiert nicht | ✅ Vollständig |
| `handoff-engine.ts` | ❌ Existiert nicht | ✅ Vollständig |
| `supervisor/` | ❌ Existiert nicht | ✅ Vollständig |
| DB Schema (Neon) | Phase 2 | Phase 2 |

---

## DIAGNOSE 3: AI REPLY FLOW

### 3.1 Webhook-Eingang
- Telegram-Webhook: `src/app/api/telegram/webhook/[boardId]/route.ts` → ruft `enqueueJob()` auf ✅
- WhatsApp-Webhook: `src/app/api/whatsapp/webhook/[boardId]/route.ts` → ruft `enqueueJob()` auf ✅

### 3.2 Job Queue
Beide Webhooks enqueuen `process_message`-Jobs korrekt.

### 3.3 Job Runner
- Cron: `/api/cron/process-jobs` (jede Minute laut `vercel.json`)
- Runner: `src/lib/jobs/runner.ts` → `case "process_message"` → `executeStateForConversation()`
- Executor: `src/lib/state-machine/executor.ts` → `executeSubAgentRun()` NUR wenn `state.type === "AI"`

### 3.4 Vercel Cron Setup
```json
{ "path": "/api/cron/process-jobs",     "schedule": "* * * * *" },
{ "path": "/api/cron/check-stuck-leads", "schedule": "0 * * * *" },
{ "path": "/api/cron/supervisor-audit",  "schedule": "0 */4 * * *" }
```

### 3.5 `executeSubAgentRun` Aufruf
Befindet sich in `src/lib/state-machine/executor.ts:245` — wird nur bei `state.type === "AI"` erreicht.

---

## DIAGNOSE 4: LIVE PRODUCTION DATA

### Datenbank
- Verbunden mit: `ep-summer-credit-alytern6-pooler.c-3.eu-central-1.aws.neon.tech`
- `.env` = Production-Neon-DB (kein separates `.env.production`)

### 4.1 Leads
| Metrik | Wert |
|--------|------|
| Neue Leads (24h) | 1 |
| Gesamt Leads | 1 |

### 4.2 Messages
| Metrik | Wert |
|--------|------|
| INBOUND | 1 |
| OUTBOUND gesamt | 1 |
| OUTBOUND (AI-generiert) | **0** |

⚠️ **1 INBOUND Message vorhanden, aber 0 AI-generierte Antworten.**  
Die 1 OUTBOUND-Message ist **nicht** AI-generiert — wahrscheinlich die statische MESSAGE-State-Antwort.

### 4.3 Jobs
| Status | Anzahl |
|--------|--------|
| PENDING | 0 |
| RUNNING | 0 |
| COMPLETED | **4** |
| FAILED | 0 |
| DEAD | 0 |

### Letzte 4 completed Jobs (chronologisch)
```
1. process_message      — userMessage="/start"  — completedAt: 14:30:17
2. summarize_conversation                        — completedAt: 14:31:15
3. process_message      — userMessage="Hello"   — completedAt: 14:31:17
4. summarize_conversation                        — completedAt: 14:32:16
```

**`process_message` Jobs liefen durch und completed — kein Error.** Das bedeutet der Executor hat den State gefunden, aber weil `state.type = MESSAGE` (nicht `AI`), wurde `executeSubAgentRun()` nie aufgerufen.

### 4.4 AgentRuns
| Metrik | Wert |
|--------|------|
| Gesamt AgentRuns (24h) | **0** |

⚠️ **Null AgentRuns** — `executeSubAgentRun()` wurde noch nie ausgeführt.

### 4.5 Fehlgeschlagene Jobs / AgentRuns
Keine. Alles "completed" — aber ohne AI-Output.

### 4.6 Board-Konfiguration
#### Board: "Vanessa Bali" (cmp5k1vel0001l7049iw29h0g)
```
Status:         admin=ACTIVE, owner=ACTIVE
Conversations:  1
Leads:          1
SystemPrompt:   ✅ Gesetzt ("You are Vanessa's AI assistant for Bali real estate...")
Brain Model:    gpt-4o-mini
AIProvider:     — (nicht konfiguriert)
```

#### States dieses Boards:
| Name | Type | Active | orderIndex |
|------|------|--------|-----------|
| New Buyer / Renter Lead | **MESSAGE** | ✅ | 0 |
| Qualified Lead | **MESSAGE** | ✅ | 1 |
| Existing Tenant Support | **MESSAGE** | ✅ | 2 |
| Viewing / Booking | **MESSAGE** | ✅ | 3 |
| Closed / Resolved | **MESSAGE** | ✅ | 4 |

⚠️ **Alle 5 States sind type `MESSAGE` — KEIN einziger AI-State.**

#### Current State der aktiven Conversation
```
conversationId:  cmp5l4zjg000sl2049j81w9bs
currentStateId:  cmp5l09u6000bl2048u1der50  ("New Buyer / Renter Lead")
status:          ACTIVE
aiEnabled:       true
frozen:          false
```

Der Lead ist im State "New Buyer / Renter Lead" (type: `MESSAGE`). `process_message` läuft, findet `state.type = MESSAGE`, sendet statischen Text (oder nichts), und beendet sich — **ohne KI-Aufruf**.

---

## ROOT CAUSE ANALYSE

### Problem 1: AdminNotification P2022

```
Vercel deployed Code:  prisma.adminNotification.create({ type: "...", body: "...", read: false })
Neon DB:               Spalten "type", "body", "read" existieren nicht mehr
→ P2022: column "admin_notifications.type" does not exist
```

**Ursache:** Phase 1 & Phase 2 wurden lokal implementiert und per `prisma db push` in die DB eingespielt, aber **nie committed und deployed**. Vercel läuft noch auf altem Code (Commit `6d22423`).

### Problem 2: AI antwortet nicht

```
State type:  MESSAGE  (nicht AI)
Executor:    erreicht case "MESSAGE" → sendet statischen Text → return
             case "AI" → executeSubAgentRun() — wird NICHT erreicht
AgentRuns:   0  (bestätigt)
```

**Ursache:** Das Board "Vanessa Bali" wurde mit States erstellt, die alle als `MESSAGE`-Pipeline-Stages konfiguriert sind (CRM-Stufen, kein AI). Es gibt keinen einzigen State vom Typ `AI`. Selbst wenn der Code korrekt deployed wäre, würde ohne AI-States keine KI-Antwort erfolgen.

---

## WAS NICHT DAS PROBLEM IST

- Telegram-Webhook → Jobs werden korrekt eingestellt ✅
- Job Runner / Cron → Jobs werden gepickt und completed ✅
- Neon DB-Schema → Ist aktuell und korrekt ✅
- `aiEnabled` auf Conversation → ist `true` ✅
- Board frozen/suspended → nein ✅
- AI API Keys → ENV-Keys (nicht in DB — normal) ✅

---

## ZWEI NÖTIGE FIXES (noch nicht gemacht)

1. **Phase 1 & 2 committen und deployen** — damit Vercel den neuen Code erhält und der P2022-Fehler verschwindet

2. **Mindestens einen State im Board auf `type: AI` umstellen** — damit der AI-Executor greift und `executeSubAgentRun()` aufgerufen wird
