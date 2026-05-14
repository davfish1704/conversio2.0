# AUDIT REPORT — CONVERSIO 2.0
**Erstellt:** 2026-05-14  
**Scope:** Read-only architecture audit zur Vorbereitung Sub-Agent Refactor  
**Repo:** `/Users/tobroe/Desktop/conversio2.0`  
**Methode:** Parallele Codebase-Analyse (Explore Agent + direkte File-Reads)  
**Status:** Kein Code geändert, keine Migrations, keine Commits

---

## SECTION 1 — PRISMA SCHEMA INVENTORY

**Provider:** PostgreSQL (Supabase/Neon), `directUrl` für Prisma-Bypass von PgBouncer  
**Migrations gesamt:** 21

### 1.1 Migration-History (letzten 7)

| Name | Datum |
|------|-------|
| `20260501084730_provider_config` | 2026-05-01 |
| `20260501092837_phase3_job_queue_and_memory` | 2026-05-01 |
| `20260502140000_add_missing_columns` | 2026-05-02 |
| `20260502150000_sync_all_drift` | 2026-05-02 |
| `20260502160000_add_board_acquisition_invites` | 2026-05-02 |
| `20260508000000_add_usage_log` | 2026-05-08 |
| `20260511000000_add_asset_management` | 2026-05-11 |

⚠️ **Sonderdatei:** `MANUAL_cleanup_duplicate_pending_invites.sql` liegt in `prisma/migrations/` — handgeschriebenes SQL ohne offizielle Prisma-Migration. Weist auf vergangenen Datendrift hin.

---

### 1.2 Models

#### `User` (users)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| email | String | unique |
| name | String? | |
| googleId | String? | unique |
| image | String? | |
| password | String? | |
| emailVerified | DateTime? | |
| verifyToken | String? | |
| role | UserRole | default: USER |
| timezone | String | default: "Europe/Berlin" |
| language | String | default: "de" |
| createdAt, updatedAt | DateTime | |

Relations: `accounts`, `sessions`, `memberships (TeamMember)`, `ownedTeams`, `boardMembers`, `messages`, `assignedLeads`

---

#### `Team` (teams)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| name | String | |
| slug | String | unique |
| ownerId | String | FK → User |
| plan | String | default: "free" ⚠️ nie ausgewertet |
| createdAt | DateTime | |

---

#### `Board` (boards) — Kern-Tenant-Objekt

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| teamId | String | FK → Team |
| name | String | |
| description | String? | |
| isActive | Boolean | default: true |
| ownerId | String | FK → User |
| adminStatus | BoardAdminStatus | ACTIVE/PAUSED/SUSPENDED |
| ownerStatus | BoardOwnerStatus | ACTIVE/INACTIVE/TRIAL |
| behaviorMode | String | default: "reactive" |
| boardCustomFields | Json | default: [] — Custom-Field-Schema |
| contextWindowSize | Int | default: 20 |
| createdAt, updatedAt | DateTime | |

Relations: `team`, `states`, `members (BoardMember)`, `leads`, `conversations`, `reports (AdminReport)`, `brain (BoardBrain)`, `mediaAssets (Asset)`, `executionLogs`, `brainDocuments`, `brainRules`, `brainFAQs`, `channels (BoardChannel)`, `aiProviderConfig`

---

#### `State` (states) — **Herz der State Machine**

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| boardId | String | FK → Board |
| name | String | |
| type | StateType | AI / MESSAGE / TEMPLATE / CONDITION / WAIT |
| mission | String? | Ziel des States für die AI |
| rules | String? | Freitext-Direktiven |
| orderIndex | Int | default: 0 |
| isActive | Boolean | default: true |
| autoTransition | Boolean | default: false |
| nextStateId | String? | **Single forward pointer** — kein Fan-Out |
| config | Json | State-type-spezifisch, schwach typisiert |
| fieldDefinitions | Json | |
| behaviorMode | String? | |
| dataToCollect | Json | default: [] — Felder die gesammelt werden sollen |
| completionRule | String? | z.B. "all_collected" |
| availableTools | Json | default: [] — Tool-Namen für AI |
| escalateOnNoReply | Int? | Minuten bis Eskalation |
| escalateOnLowConfidence | Boolean | default: true |
| escalateOnOffMission | Boolean | default: true |
| maxFollowups | Int | default: 3 |
| followupAction | String | default: "escalate" |
| followupTargetState | String? | |
| allowChannelSwitch | Boolean | default: true |
| createdAt, updatedAt | DateTime | |

Relations: `board`, `leads`, `conversations`, `assetLinks (AssetState)`

⚠️ **Fehlend für Sub-Agent Refactor:** Kein `agentSystemPrompt`, `agentGoal`, `agentRole`, `handoffRules` — diese müssen per Migration ergänzt werden.

---

#### `Lead` (leads)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| boardId | String | FK → Board |
| currentStateId | String? | FK → State |
| assignedToId | String? | FK → User |
| name | String | |
| phone, email, avatar | String? | |
| source | String | default: "manual" |
| channel | String | default: "whatsapp" |
| tags | String[] | default: [] |
| leadScore | Int | default: 0 |
| stateHistory | Json | Audit-Trail der State-Wechsel |
| stageMovedAt | DateTime? | |
| stageMovedBy | String? | "manual" / "ai_advance" |
| customData | Json | default: {} — Custom Fields |
| createdAt, updatedAt | DateTime | |

Index: `[boardId, currentStateId]`

---

#### `Conversation` (conversations)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| leadId | String | FK → Lead |
| boardId | String | FK → Board |
| currentStateId | String? | FK → State |
| channel | String | default: "whatsapp" |
| externalId | String? | Plattform-Chat-ID |
| status | ConversationStatus | ACTIVE/ARCHIVED/SPAM |
| frozen | Boolean | default: false |
| frozenAt, frozenReason, frozenBy | — | Escalation-Tracking |
| aiEnabled | Boolean | default: true |
| followupCount | Int | default: 0 |
| conversationSummary | String? | Komprimierte History |
| summaryUpdatedAt | DateTime? | |
| messageCountSinceSum | Int | default: 0 |
| customData | Json | |
| lastMessageAt | DateTime | default: now() |
| createdAt, updatedAt | DateTime | |

Indexes: `[leadId, lastMessageAt]`, `[boardId, status, lastMessageAt]`

---

#### `Message` (messages)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| conversationId | String | FK → Conversation |
| authorId | String? | FK → User, null = AI |
| direction | Direction | INBOUND / OUTBOUND |
| content | String | |
| mediaUrl | String? | |
| messageType | MessageType | TEXT/IMAGE/AUDIO/VIDEO/DOCUMENT/TEMPLATE/LOCATION |
| status | MessageStatus | PENDING/SENT/DELIVERED/READ/FAILED |
| aiGenerated | Boolean | default: false |
| externalId | String? | |
| timestamp | DateTime | |
| metadata | Json | |

Index: `[conversationId, timestamp]`

---

#### `BoardBrain` (board_brains) — AI-Konfiguration

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| boardId | String | **unique** — 1:1 mit Board |
| systemPrompt | String | |
| stylePrompt | String | |
| infoPrompt | String | |
| rulePrompt | String | |
| defaultModel | String | default: "gpt-4o-mini" |
| temperature | Float | default: 0.7 |
| maxTokens | Int | default: 500 |
| language | String | default: "de" |
| tone | String | default: "friendly" |
| channelSwitchTemplate | String? | |
| createdAt, updatedAt | DateTime | |

⚠️ **1:1 mit Board** — kein per-State Prompt-Override möglich.

---

#### `AIProviderConfig` (ai_provider_configs)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| boardId | String | **unique** — 1:1 mit Board |
| defaultProvider | String | default: "groq" |
| defaultModel | String | default: "llama-3.3-70b-versatile" |
| fallbackProvider | String? | |
| fallbackModel | String? | |
| modelOverrides | Json | default: {} — per-purpose |
| createdAt, updatedAt | DateTime | |

⚠️ **1:1 mit Board** — kein per-State Provider-Selektion.

---

#### `PlatformAPIKey` (platform_api_keys)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| provider | String | unique |
| encryptedKey | String | |
| isActive | Boolean | default: true |
| monthlyBudgetCents | Int? | Limit-Feld, keine Enforcement |
| createdAt | DateTime | |

---

#### `BoardChannel` (board_channels)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| boardId + platform | — | Unique-Pair |
| status | String | default: "disconnected" |
| telegramBotToken | String? | verschlüsselt |
| telegramBotUsername | String? | |
| telegramWebhookSecret | String? | |
| waPhoneNumberId | String? | |
| waAccessToken | String? | verschlüsselt |
| waBusinessAccountId | String? | |
| waVerifyToken | String? | |
| igPageId | String? | Instagram — kein Send-Code |
| igAccessToken | String? | Instagram |
| lastError | String? | |
| connectedAt | DateTime? | |

---

#### `ChannelInvite` (channel_invites)

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| token | String | unique |
| source | InviteSource | LEAD_REINVITE / BOARD_ACQUISITION |
| status | ChannelInviteStatus | PENDING/CONSUMED/EXPIRED |
| leadId, boardId, targetChannelId | — | |
| expiresAt, consumedAt, consumedConversationId | — | |

Indexes: `[token]`, `[leadId, createdAt]`

---

#### `LeadMemory` (lead_memory)

K/V-Store pro Lead: `{id, leadId, key, value}` — Unique `[leadId, key]`

---

#### `Job` (jobs) — Async Queue

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| id | String (cuid) | PK |
| type | String | "process_message" / "escalation_check" / "summarize_conversation" |
| payload | Json | |
| scheduledFor | DateTime | |
| status | JobStatus | PENDING/RUNNING/COMPLETED/FAILED/CANCELLED/DEAD |
| attempts / maxAttempts | Int | default: 0 / 3 |
| lastError | String? | |
| leadId, boardId | String? | |

Indexes: `[status, scheduledFor]`, `[leadId]`

---

#### `UsageLog` (usage_logs) — Token/Cost-Tracking

| Feld | Typ | Besonderheiten |
|------|-----|----------------|
| boardId, conversationId? | — | |
| model, provider | String | |
| inputTokens, outputTokens, totalTokens | Int | |
| providerCost | Float | USD Cents |
| creditCharged | Float | ⚠️ **immer 0.0 — nie gesetzt** |

Indexes: `[boardId, createdAt]`, `[model, createdAt]`

---

#### `AdminReport` (admin_reports)

`{boardId, stateId?, type: AlertType, message, status: AlertStatus}`  
`AlertType`: STUCK / ERROR / MANUAL_INTERVENTION / LOOP / INFO  
`AlertStatus`: OPEN / IN_PROGRESS / RESOLVED / IGNORED

---

#### `ExecutionLog` (execution_logs)

`{boardId, conversationId, stateId, action, input, output, context, status: ExecutionStatus, errorMessage, needsAttention}`  
`ExecutionStatus`: SUCCESS / ERROR / STUCK / WAITING_USER / MANUAL_INTERVENTION / LOOP  
Index: `[boardId, status, createdAt]`

---

#### `ProcessedWebhook` (processed_webhooks) — Idempotenz

`{externalId, channel, boardId}` — Unique-Triple. Index: `[processedAt]`

---

#### `Asset` / `AssetState` (R2-backed Media)

`Asset`: id, boardId, name, mimeType, sizeBytes, r2Key (unique), publicUrl, tags, type (IMAGE/PDF/AUDIO/VIDEO/DOCUMENT)  
`AssetState`: id, assetId, stateId (unique pair) — M:N Asset ↔ State

---

#### `BrainDocument` / `BrainRule` / `BrainFAQ` (Knowledge Base)

Alle: `{id, boardId, content/rule/answer, createdAt}`

---

### 1.3 Enums

| Enum | Values |
|------|--------|
| UserRole | ADMIN, USER, AGENT |
| Role (TeamMember) | ADMIN, MEMBER, VIEWER |
| BoardRole | ADMIN, AGENT, VIEWER |
| StateType | AI, MESSAGE, TEMPLATE, CONDITION, WAIT |
| ConversationStatus | ACTIVE, ARCHIVED, SPAM |
| Direction | INBOUND, OUTBOUND |
| MessageType | TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT, TEMPLATE, LOCATION |
| MessageStatus | PENDING, SENT, DELIVERED, READ, FAILED |
| BoardAdminStatus | ACTIVE, PAUSED, SUSPENDED |
| BoardOwnerStatus | ACTIVE, INACTIVE, TRIAL |
| ChannelInviteStatus | PENDING, CONSUMED, EXPIRED |
| InviteSource | LEAD_REINVITE, BOARD_ACQUISITION |
| JobStatus | PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, DEAD |
| AssetType | IMAGE, PDF, AUDIO, VIDEO, DOCUMENT |
| ExecutionStatus | SUCCESS, ERROR, STUCK, WAITING_USER, MANUAL_INTERVENTION, LOOP |
| AlertType | STUCK, ERROR, MANUAL_INTERVENTION, LOOP, INFO |
| AlertStatus | OPEN, IN_PROGRESS, RESOLVED, IGNORED |

---

## SECTION 2 — STATE MACHINE / AGENT EXECUTION

### 2.1 State Transitions

| Datei | Funktion | Trigger |
|-------|----------|---------|
| `src/lib/state-machine.ts` | `getCurrentState(conversationId)` | intern |
| `src/lib/state-machine.ts` | `checkStateTransition(conversationId, state, msg)` | nach jeder Nachricht |
| `src/lib/state-machine.ts` | `transitionState(conversationId, newStateId, reason?, userId?)` | AI ("ai_advance") / UI-Drag ("manual") |
| `src/lib/state-machine/executor.ts` | `executeStateForConversation(conversationId, userMessage)` | Job Runner |

**Transition-Logik in `checkStateTransition`:**
- CONDITION-Type: Parsed `state.rules` als "score > 50" / "contains: ja"
- `autoTransition=true`: Sofortiger Wechsel zu `nextStateId`
- Keyword-Fallback: Matcht DE/EN Affirmativ-Keywords (ja, yes, ok, klar, gerne, passt, perfekt, interessiert, weiter)

**Trigger-Typen:**
- **Cron (jede Minute):** `/api/cron/process-jobs` → `src/lib/jobs/runner.ts::processNextBatch()` → `executeStateForConversation()`
- **Webhook:** Telegram/WhatsApp → Enqueue `process_message` Job
- **Manual UI (Drag-Drop):** `PATCH /api/crm/pipeline` → `transitionState()` mit reason="manual"

### 2.2 AI-Call — Wo der LLM aufgerufen wird

**⚠️ Zwei parallele Execution-Pfade:**

**Path A — `src/lib/orchestration/index.ts` (457 LOC)** — Hauptpfad
- Funktion: `orchestrate(input: OrchestrationInput): Promise<OrchestrationResult>`
- Aufgerufen von: `executor.ts` für `StateType = AI`
- AI-Call bei Zeile ~334: `aiRegistry.execute({boardId, purpose, messages, tools, temperature, maxTokens})`
- **🔴 KRITISCHER BUG:** Kein `prisma.usageLog.create()` nach dem AI-Call. Token-Usage wird mit `{ input: 0, output: 0, total: 0 }` übergeben. **Cost-Tracking für den Hauptpfad ist defekt.**

**Path B — `src/lib/ai/tool-engine.ts` (388 LOC)**
- Eigener Tool-Calling Loop (bis zu 3 Iterationen)
- Schreibt `UsageLog` korrekt (Zeile 231–244)
- ❓ UNCLEAR: Ob Path B Path A ersetzt oder parallel läuft — Abhängigkeit unklar

### 2.3 Prompt-Builder

**Datei:** `src/lib/ai/prompt/builder.ts`

```typescript
function buildSystemPrompt(
  brain: PromptBrain,        // systemPrompt, stylePrompt, infoPrompt, rulePrompt, language, tone
  state: PromptState,        // id, name, type, mission, rules, nextStateId, dataToCollect, availableTools
  memories: PromptMemory[],  // [{key, value}] aus LeadMemory
  knowledge: PromptKnowledge,// {rules: BrainRule[], faqs: BrainFAQ[], docs: BrainDocument[]}
  options: PromptOptions,    // channel, conversationSummary, customData, language
): string
```

**Injected Components (in Reihenfolge):**
1. `brain.systemPrompt`
2. Style/Tone Section (`stylePrompt`)
3. `brain.infoPrompt` — Kontext-Wissen
4. `brain.rulePrompt` — Board-Regeln
5. `knowledge.rules` — BrainRules aus DB
6. `knowledge.faqs` — BrainFAQs aus DB
7. `knowledge.docs` — BrainDocuments aus DB
8. `state.mission` / `state.rules` — State-Direktiven
9. `state.dataToCollect` — zu sammelnde Felder
10. `leadMemories` — LeadMemory K/V
11. `conversationSummary` — komprimierte History
12. `customData` — Lead Custom Fields
13. `formatMemoryForPrompt(memory)` — strukturiertes Memory

Danach: `buildPromptMessages()` baut AIMessage-Array aus letzten 5 Messages (hardcoded, `take: 5` Zeile ~294 in orchestration/index.ts).

### 2.4 Job Queue

**Tabelle:** `Job` (jobs) — eigene DB-Tabelle, kein Bull/Redis

**Runner:** `src/lib/jobs/runner.ts` (208 LOC) — `processNextBatch(limit = 10)`
- `FOR UPDATE SKIP LOCKED` — Advisory Lock per Conversation
- Exponential Backoff: `60s × 2^(attempts-1)`
- Nach 3 Fehlern: `status = DEAD` + Admin-Notification

**Vercel Cron Routes:**
```json
{ "path": "/api/cron/process-jobs",      "schedule": "* * * * *"  }
{ "path": "/api/cron/check-stuck-leads", "schedule": "0 * * * *"  }
```

**Idempotenz:** `ProcessedWebhook` Unique-Triple `[externalId, channel, boardId]`

### 2.5 Tool-Use Framework

**Registry:** `src/lib/tools/registry.ts`  
**Index:** `src/lib/tools/index.ts`  
**Definitionen:** `src/lib/tools/definitions/`

**Live-Tools:**

| Tool | Datei | Funktion |
|------|-------|---------|
| `update_lead_data` | `update_lead_data.ts` | Schreibt `Lead.customData` |
| `advance_state` | `advance_state.ts` | State-Transition ausführen |
| `escalate_to_human` | `escalate_to_human.ts` | Conversation einfrieren + AdminReport |
| `send_template` | `send_template.ts` | Vorkonfigurierten Text senden |
| `set_lead_score` | `set_lead_score.ts` | `Lead.leadScore` setzen |
| `suggest_channel_switch` | `suggest-channel-switch.ts` | ChannelInvite erstellen |
| `send_asset` | `send-asset.ts` | R2-Asset als Media-Nachricht |
| `search_assets` | `search-assets.ts` | Assets per Tag/Typ suchen |

**Legacy-Tools (deprecated, noch registriert):** `change_state`, `send_text`, `store_memory`, `get_history`

**Default für neue AI-States:**
```typescript
export const DEFAULT_AI_STATE_TOOLS = [
  "update_lead_data",
  "advance_state",
  "escalate_to_human",
]
```

**Stub-Tools (nur UI, keine Implementierung):** `book_calendar`, `send_email`, `trigger_webhook`, `create_stripe_link`, `generate_pdf`

---

## SECTION 3 — MULTI-PROVIDER AI ABSTRACTION

### 3.1 Provider-Layer

**Registry:** `src/lib/ai/registry.ts` (250 LOC)  
**Provider-Files:** `src/lib/ai/providers/` — anthropic.ts, groq.ts, openai.ts, openrouter.ts, deepseek.ts

### 3.2 Provider-Selection

1. Lade `AIProviderConfig` aus DB per `boardId` (1:1 per Board)
2. Wende `modelOverrides[purpose]` an
3. Primary Provider mit 3× Retry (Exponential Backoff: 1s, 2s, 4s)
4. Falls Fehler: `fallbackProvider`/`fallbackModel` wenn konfiguriert
5. API-Key-Cache: In-Memory Map, 60s TTL, Fallback auf Env-Vars

**Supported Providers:**

| Provider | Default-Modell | Preisrahmen Input/Output (¢/1M Token) |
|----------|---------------|--------------------------------------|
| Groq | llama-3.3-70b-versatile | 5.9 / 7.9 |
| OpenRouter | deepseek-chat | variabel |
| OpenAI | gpt-4o-mini | ~150 / 600 |
| DeepSeek | deepseek-chat | günstig |
| Anthropic | claude-sonnet-4-6 | 300 / 1500 |

### 3.3 Fallback

- 3× Retry bei Primary Provider
- Danach: Wechsel auf `fallbackProvider` falls gesetzt
- Falls kein Fallback: Exception → Job schlägt fehl → Retry-Logik

### 3.4 Token / Cost Tracking

- `aiRegistry.execute()` gibt `{usage: {inputTokens, outputTokens, totalTokens}, providerCost, model, provider}` zurück
- **Korrekt geloggt:** `src/lib/ai/tool-engine.ts:231` → `prisma.usageLog.create()`
- **🔴 NICHT geloggt:** `src/lib/orchestration/index.ts:334` — Haupt-AI-Call ohne UsageLog
- `UsageLog.creditCharged` — Feld vorhanden, **immer 0.0**, nie gesetzt
- Admin-Markup: Fest 2.0× in `src/app/api/admin/usage/route.ts`

### 3.5 API-Key-Storage

**Priorität:** `PlatformAPIKey` DB (verschlüsselt) → Env-Vars (Fallback)  
**Encryption:** `ENCRYPTION_KEY` Env-Variable, eigene Implementierung in `src/lib/crypto/`

---

## SECTION 4 — MESSAGING DISPATCHER

### 4.1 Dispatcher

**Datei:** `src/lib/messaging/dispatcher.ts` (258 LOC)

**Hauptfunktionen:**

- `sendMessage(conversationId, text)` — Text senden per Channel
- `sendMediaMessage(conversationId, media)` — Media senden (mimeType-Mapping)
- `sendAIResponse(conversationId, text)` — Detektiert R2-URLs in Text, sendet als Media, restlichen Text als Text

### 4.2 Channel-Status

| Channel | Send | Media | Webhook | Status |
|---------|------|-------|---------|--------|
| WhatsApp | ✅ `graph.facebook.com/v18.0/{id}/messages` | ✅ | ✅ | Live |
| Telegram | ✅ `/bot{token}/sendMessage` | ✅ sendPhoto/Audio/Video/Document | ✅ | Live |
| Instagram | ❌ | ❌ | ❌ | Nur Schema |

### 4.3 Webhook-Endpoints

| Route | Method | Status |
|-------|--------|--------|
| `/api/whatsapp/webhook/[boardId]` | GET | ✅ Meta Verify |
| `/api/whatsapp/webhook/[boardId]` | POST | ✅ Message Processing |
| `/api/telegram/webhook/[boardId]` | POST | ✅ Update Processing (346 LOC) |
| `/api/webhooks/status` | GET | ✅ Health Check |

### 4.4 Channel-Connection-State

Gespeichert in `BoardChannel`:
- `status`: "connected" / "disconnected" / "error"
- `lastError`: Letzter Fehlertext
- `connectedAt`: Timestamp der Verbindung

---

## SECTION 5 — ADMIN / SUPERVISOR INFRASTRUCTURE

### 5.1 Admin-Bereich

**Admin-Guard:** `src/lib/auth/admin-guard.ts` — `requireAdmin(userId)` wirft bei `user.role ≠ ADMIN`

**API Routes:**

| Route | Funktion |
|-------|----------|
| `/api/admin/notifications` | CRUD AdminReport |
| `/api/admin/platform-keys` | Verwaltung verschlüsselter API-Keys |
| `/api/admin/reports/[id]` | Status-Updates für Reports |
| `/api/admin/scan` | Health-Scan (stuck, loops) |
| `/api/admin/usage` | Token/Cost-Aggregation (2× Markup) |

**UI-Routes:** `/dashboard/admin-bot`, `/dashboard/admin-notifications`, `/dashboard/admin-usage`

### 5.2 Admin-Telegram-Bot

**Datei:** `src/lib/notifications/admin-notify.ts`

Funktion `notifyAdmin({type, title, body, boardId?, leadId?, jobId?})`:
1. DB-Write: `prisma.adminNotification.create()` — ⚠️ `AdminNotification` Tabelle **existiert nicht im Schema** (silent catch, schlägt immer fehl)
2. E-Mail via Resend API (wenn `RESEND_API_KEY` + `ADMIN_EMAIL`)
3. Telegram-Nachricht an `ADMIN_TELEGRAM_CHAT_ID` (wenn Token gesetzt)

**Notification-Types:** `FAILED_JOB`, `LEAD_STUCK`, `SYSTEM_ERROR`

⚠️ Kein Inbound-Command-Handler — Bot kann nur senden, nicht empfangen.

### 5.3 Audit-Logging

| Tabelle | Was geloggt wird |
|---------|-----------------|
| `ExecutionLog` | State-Execution mit Input/Output/Status |
| `AdminReport` | Escalations, Errors, Stuck-States |
| `UsageLog` | Token-Counts + Costs (partiell — nur via tool-engine Pfad) |
| `Job` | Job-Lifecycle |
| `Lead.stateHistory` | State-Transition-History pro Lead (Json) |
| `ProcessedWebhook` | Idempotenz-Tracking |

---

## SECTION 6 — CREDIT / BILLING SYSTEM

### Status: ❌ NICHT IMPLEMENTIERT

| Feature | Status |
|---------|--------|
| Stripe Integration | ❌ Nur Stub-Tool in StateForm.tsx UI |
| Credit-Felder (User/Team/Board) | ❌ Keine |
| Auto-Recharge | ❌ |
| Soft-Stop bei Balance=0 | ❌ |
| Plan-Enforcement | ❌ `Team.plan` existiert ("free"), wird nie ausgewertet |
| `UsageLog.creditCharged` | ❌ Feld vorhanden, immer 0.0 |

**Was existiert:**
- `UsageLog.providerCost` — Provider-Kosten in USD Cents (partiell tracked)
- `PlatformAPIKey.monthlyBudgetCents` — Budget-Limit-Feld, keine Enforcement-Logic
- Admin-Usage-Report mit 2× Markup als manuelle Kalkulation

---

## SECTION 7 — BOARDS / TENANTS / LEADS

### 7.1 Multi-Tenancy-Modell

```
User → [TeamMember] → Team → Board → Lead → Conversation
                    ↕
               [BoardMember]
```

**Isolation:** Board-Level. Leads, States, Conversations, BrainData, Assets sind alle `boardId`-scoped.

**Access Control:**
- `User.role = ADMIN`: Platform-Admin-Zugriff
- `BoardMember.role = ADMIN`: Vollzugriff auf Board
- `BoardMember.role = AGENT`: Read/Write, kein Delete
- `BoardMember.role = VIEWER`: Read-Only

### 7.2 Custom Fields

- **Schema-Definition:** `Board.boardCustomFields` (Json `[]`) — Feldtypen + Namen
- **Datenhaltung:** `Lead.customData` (Json `{}`) — K/V-Pairs pro Lead
- **State-Integration:** `State.dataToCollect` (Json `[]`) — zu sammelnde Felder
- **Update-Endpoint:** `PATCH /api/conversations/[id]/fields`

### 7.3 Test-Board `cmoqqpwn70001bro1metou154`

❓ UNCLEAR — Kein Verweis auf diese ID im Codebase oder Seed-Files. Existiert nur als DB-Datensatz.

Seed-Files: `prisma/seed.ts`, `scripts/seed-test-users.ts`, `scripts/seed-e2e-user.ts`

---

## SECTION 8 — UI / FRONTEND

### 8.1 Alle Routes

**Auth (`src/app/(auth)/):**  
`/login`, `/signup` (Feature-Flag), `/verify-email`

**Dashboard (`src/app/(dashboard)/):**

| Route | LOC | Status |
|-------|-----|--------|
| `/dashboard` | 540 | ✅ |
| `/boards` | — | ✅ |
| `/boards/[id]` | — | ✅ Kanban |
| `/boards/[id]/flow` | — | ✅ State-Editor |
| `/boards/[id]/brain` | 514 | ✅ BrainLab |
| `/boards/[id]/assets` | — | ✅ Asset-Manager |
| `/boards/[id]/usage` | — | ✅ Cost-Dashboard |
| `/boards/[id]/settings` | 799 | ✅ |
| `/boards/[id]/settings/access` | 375 | ✅ |
| `/crm` | — | ✅ |
| `/reports` | 421 | ✅ |
| `/team` | 247 | ✅ |
| `/settings` | 252 | ✅ |
| `/admin-bot` | — | ✅ |
| `/admin-notifications` | — | ✅ |
| `/admin-usage` | — | ✅ |

**Public:** `/`, `/product`, `/pricing`, `/features`, `/contact`, `/agb`, `/datenschutz`, `/impressum`

### 8.2 Kanban Board

- **Components:** `PipelineBoard`, `KanbanColumn`, `SortableLeadCard`, `LeadDrawer.tsx` (1067 LOC)
- **Drag-Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Status:** ✅ Funktional

### 8.3 State-Editor UI

- **Files:** `src/app/(dashboard)/boards/[id]/flow/` + `src/components/flow-builder/StateForm.tsx` (393 LOC)
- **Konfigurierbar:** Name, Type, Mission, Rules, Tools (hardcoded Liste inkl. Stubs), dataToCollect, completionRule, nextStateId, Escalation-Settings
- **⚠️ Problem:** Stub-Tools (`book_calendar` etc.) erscheinen als wählbare Optionen

### 8.4 Lead Detail View

- **File:** `LeadDrawer.tsx` (1067 LOC)
- **Inhalt:** Lead-Info, Custom Fields, State-History, Conversations, Messages, Lead Score, Channel-Switch, Memory-Viewer

### 8.5 BrainLab UI

- **File:** `src/app/(dashboard)/boards/[id]/brain/page.tsx` (514 LOC)
- **Features:** System/Style/Info/Rule-Prompts, BrainDocuments, BrainRules, BrainFAQs, AI-Simulation (Chat-Test via "simulate-" prefix)

---

## SECTION 9 — DEPLOYMENT / ENV / CONFIG

### 9.1 Vercel

**`vercel.json` (vollständig):**
```json
{
  "crons": [
    { "path": "/api/cron/process-jobs",      "schedule": "* * * * *" },
    { "path": "/api/cron/check-stuck-leads", "schedule": "0 * * * *" }
  ]
}
```

Keine Function-Timeouts, Rewrites, oder Region-Config. Alles Vercel-Default.

### 9.2 Environment Variables (nur Namen)

| Variable | Kategorie | Pflicht |
|----------|-----------|---------|
| `DATABASE_URL` | DB | ✅ |
| `DIRECT_URL` | DB | ✅ |
| `NEXTAUTH_URL` | Auth | ✅ |
| `NEXTAUTH_SECRET` | Auth | ✅ |
| `ENCRYPTION_KEY` | Security | ✅ |
| `CRON_SECRET` | Security | ✅ |
| `NEXT_PUBLIC_APP_URL` | Public | ✅ |
| `GOOGLE_CLIENT_ID` | Auth | Optional |
| `GOOGLE_CLIENT_SECRET` | Auth | Optional |
| `GROQ_API_KEY` | AI | Optional (env-Fallback) |
| `OPENROUTER_API_KEY` | AI | Optional |
| `OPENAI_API_KEY` | AI | Optional |
| `DEEPSEEK_API_KEY` | AI | Optional |
| `ANTHROPIC_API_KEY` | AI | Optional |
| `TELEGRAM_BOT_TOKEN` | Messaging | Optional |
| `META_ACCESS_TOKEN` | Messaging | Optional |
| `META_PHONE_NUMBER_ID` | Messaging | Optional |
| `META_WEBHOOK_VERIFY_TOKEN` | Messaging | Optional |
| `META_APP_SECRET` | Messaging | Optional |
| `R2_ACCOUNT_ID` | Storage | Optional |
| `R2_ACCESS_KEY_ID` | Storage | Optional |
| `R2_SECRET_ACCESS_KEY` | Storage | Optional |
| `R2_BUCKET_NAME` | Storage | Optional |
| `R2_PUBLIC_URL` | Storage | Optional |
| `UPSTASH_REDIS_REST_URL` | Rate-Limit | Optional |
| `UPSTASH_REDIS_REST_TOKEN` | Rate-Limit | Optional |
| `RESEND_API_KEY` | Email | Optional |
| `ADMIN_EMAIL` | Admin | Optional |
| `ADMIN_TELEGRAM_CHAT_ID` | Admin | Optional |
| `NEXT_PUBLIC_FEATURE_SIGNUP` | Feature-Flag | Optional |
| `NEXT_PUBLIC_FEATURE_WHATSAPP` | Feature-Flag | Optional |
| `NEXT_PUBLIC_FEATURE_BUILDER` | Feature-Flag | Optional |

### 9.3 Build Scripts

```json
{
  "dev":         "next dev",
  "postinstall": "prisma generate",
  "build":       "prisma generate && next build",
  "start":       "next start",
  "lint":        "next lint",
  "db:seed":     "ts-node prisma/seed.ts",
  "db:generate": "prisma generate",
  "db:push":     "prisma db push",
  "test:db":     "vitest run tests/database.test.ts",
  "test:auth":   "vitest run tests/auth.test.tsx",
  "test:e2e":    "playwright test",
  "db:seed-e2e": "ts-node scripts/seed-e2e-user.ts"
}
```

✅ `postinstall: "prisma generate"` vorhanden.

---

## SECTION 10 — KNOWN ISSUES & TECHNICAL DEBT

### 10.1 TODOs / FIXMEs / HACKs / BUGs

**Exakt 1 TODO im gesamten `src/`-Verzeichnis:**

```
src/app/api/telegram/webhook/[boardId]/route.ts:146
// TODO: Wenn boardBrain ein Welcome-Message-Feld bekommt, hier auto-greeten
```

Kein FIXME, HACK oder BUG-Kommentar gefunden.

### 10.2 `@ts-ignore` / `as any`

**Gesamt: 149 Instanzen**

| Datei | Anzahl | Root Cause |
|-------|--------|-----------|
| `src/app/api/telegram/webhook/[boardId]/route.ts` | ~13 | Prisma-Drift |
| `src/app/api/crm/pipeline/route.ts` | ~8 | Prisma-Drift |
| `src/lib/orchestration/index.ts` | ~5 | `brainRule/FAQ/Doc/leadMemory` alle `as any` |
| `src/app/api/leads/[leadId]/invite-channel/route.ts` | ~5 | Prisma-Drift |
| `src/auth.ts:124` | 1 | `(user as any).role` in JWT callback |
| `src/lib/notifications.ts` | 1 | `(prisma as any).adminReport.create` |

**Root Cause:** Prisma-Client nicht aktuell generiert nach Schema-Änderungen → `as any` Workarounds im Working-Tree.

### 10.3 Pain Points

- `"I'll help you with that shortly."` in `src/lib/orchestration/index.ts:383` — **englischer Fallback-Text** wird an deutschsprachige Kunden gesendet
- WhatsApp Webhooks antworten immer 200 (Meta-Anforderung) — Fehler werden geloggt aber nicht propagiert
- `prisma.adminNotification.create()` in `admin-notify.ts` — Tabelle nicht im Schema → silent fail bei jedem Admin-Notify

### 10.4 Files > 500 LOC (Refactor-Kandidaten)

| Datei | LOC |
|-------|-----|
| `src/lib/translations.ts` | 1084 |
| `src/components/boards/LeadDrawer.tsx` | 1067 |
| `src/app/(dashboard)/boards/[id]/settings/page.tsx` | 799 |
| `src/app/page.tsx` | 608 |
| `src/app/(dashboard)/dashboard/page.tsx` | 540 |
| `src/app/(dashboard)/boards/[id]/brain/page.tsx` | 514 |
| `src/lib/orchestration/index.ts` | 457 |
| `src/app/(dashboard)/reports/page.tsx` | 421 |
| `src/components/boards/LeadImportModal.tsx` | 411 |
| `src/components/flow-builder/StateForm.tsx` | 393 |
| `src/lib/ai/tool-engine.ts` | 388 |
| `src/app/(dashboard)/boards/[id]/settings/access/page.tsx` | 375 |
| `src/app/api/telegram/webhook/[boardId]/route.ts` | 346 |
| `src/lib/state-machine/executor.ts` | 306 |

---

## SECTION 11 — REFACTOR READINESS ASSESSMENT

### 11.1 Code-Pfade die bei State-Model-Erweiterung angepasst werden müssen

Bei Addition von `agentSystemPrompt`, `agentGoal`, `agentRole`, `handoffRules`:

| Datei | Was muss angepasst werden |
|-------|--------------------------|
| `prisma/schema.prisma` | Migration: Neue Felder zu `State` |
| `src/lib/ai/prompt/builder.ts` | `PromptState` Interface + `buildSystemPrompt()` |
| `src/lib/orchestration/index.ts:251` | `statePrompt` Objekt-Konstruktion |
| `src/lib/state-machine/executor.ts` | Dispatch-Logik für neue StateTypes |
| `src/lib/state-machine.ts` | `checkStateTransition()` für handoffRules |
| `src/components/flow-builder/StateForm.tsx` | UI-Felder |
| `src/app/api/boards/[id]/states/route.ts` | CRUD für neue Felder |

### 11.2 Wo LLM-Call-Results verarbeitet werden (Andock-Punkt für `AgentRun`)

**Haupt-Andockpunkt: `src/lib/orchestration/index.ts:389–440`**

```
aiRegistry.execute()                      Zeile ~334
  → responseText = sanitizeAIOutput()     Zeile 346
  → prisma.message.create() (OUTBOUND)    Zeile 391
  → sendAIResponse()                      Zeile 401
  → prisma.conversation.update()          Zeile 404
  → appendFact()                          Zeile 409
  → updateMemory()                        Zeile 413
  ← HIER AgentRun.create() einfügen →
  → recordExecution() → ExecutionLog      Zeile 418
```

Alle relevanten Daten sind nach Zeile 413 verfügbar: `conversationId`, `stateId`, `boardId`, `responseText`, `toolCalls`, `tokenUsage`, `extraction`.

### 11.3 Single-Agent-per-Board Annahmen (Breaking Points bei Migration)

| Code-Stelle | Problem |
|-------------|---------|
| `BoardBrain` 1:1 mit Board | Alle States teilen denselben System-Prompt |
| `AIProviderConfig` 1:1 mit Board | Provider global, nicht per State |
| `orchestrate()` lädt `board.brain` ohne State-Override | State-eigene Prompts würden ignoriert |
| `Board.contextWindowSize` | Globale Window-Size |
| `State.nextStateId` — Single-Forward-Pointer | Kein Fan-Out für Sub-Agent Handoffs |

**Was bereits Multi-Agent-ready ist:**
- ✅ `State.availableTools` — per-State Tool-Konfiguration
- ✅ `State.mission` / `State.rules` — per-State Direktiven
- ✅ `State.dataToCollect` — per-State Memory-Schema
- ✅ `State.escalateOnNoReply/LowConfidence/OffMission` — per-State Eskalationsregeln
- ✅ Job-Queue mit Advisory-Locks
- ✅ `ExecutionLog` pro State-Execution

### 11.4 Was VOR dem Refactor gefixt werden muss

**🔴 KRITISCH (muss vor Refactor):**

1. **UsageLog-Gap in `orchestration/index.ts`** — `aiRegistry.execute()` Response wird nie in `UsageLog` geschrieben. Billing-System ist blind für den Hauptpfad. Fix: Response-Token-Daten nach Zeile 341 persistieren.

2. **Prisma-Client-Drift** — `brainRule`, `brainFAQ`, `brainDocument`, `leadMemory`, `adminReport` werden mit `(prisma as any)` aufgerufen. `prisma generate` muss ausgeführt und alle Imports korrigiert werden, sonst baut der Refactor auf defekten Types auf.

3. **`AdminNotification` Tabelle fehlt** — `src/lib/notifications/admin-notify.ts:L10` versucht `prisma.adminNotification.create()` — dieses Model existiert nicht im Schema. Jede Admin-Benachrichtigung schlägt mit silent-catch fehl.

**🟡 SOLLTE vor Refactor (aber nicht blockierend):**

4. **Englischer Fallback-Text** — `"I'll help you with that shortly."` in `orchestration/index.ts:383` muss German-Fallback bekommen.

5. **Tool-Engine vs. Orchestration Duplizierung klären** — Zwei parallele AI-Execution-Pfade. Welcher ist kanonisch? Welcher wird deprecated?

6. **`State.nextStateId` auf Fan-Out erweitern** — Single-Forward-Pointer reicht für Handoff-Rules nicht aus. Kandidat: `handoffRules: Json` mit Array von `{condition, targetStateId}`.

---

## SECTION 12 — RECOMMENDED NEXT STEPS

### Was zuerst stabilisieren?

**Drei Pflicht-Fixes vor dem Refactor:**

**1. `prisma generate` + alle `as any` Casts entfernen**  
149 `as any` sind kein Code-Style-Problem — sie zeigen an dass der Prisma-Client-Type out-of-sync ist. Ohne saubere Types baut der gesamte Refactor auf unsicherem Fundament. Nach `prisma generate` sollten ~80% der `as any` Casts durch echte Types ersetzt werden können.

**2. UsageLog-Gap schließen**  
`orchestration/index.ts` Zeile ~334: nach `aiRegistry.execute()` fehlt `prisma.usageLog.create()`. Das ist ein Datenbankwrite, 3 Zeilen Code, der das gesamte Billing-System repariert. Muss vor dem Refactor, weil sonst ein zukünftiges Credit-System auf Phantom-Daten aufbaut.

**3. `AdminNotification` bereinigen**  
Entweder: `AdminNotification` Model zum Schema hinzufügen. Oder: `admin-notify.ts` auf `AdminReport` umstellen (das Model existiert und wird bereits von `notifications.ts` genutzt). Eine der beiden Tabellen ist redundant.

### Die 3 größten Risk-Files

| Rang | Datei | Risiko |
|------|-------|--------|
| 🔴 1 | `src/lib/orchestration/index.ts` (457 LOC) | Haupt-AI-Orchestration, hat kritischen UsageLog-Bug, viele `as any`, wird durch Sub-Agent-Refactor komplett restrukturiert. Zentralste Datei im System. |
| 🔴 2 | `src/app/api/telegram/webhook/[boardId]/route.ts` (346 LOC) | 13+ `as any`, enthält Message-Processing + Invite-Logic + Channel-Switch in einer Route — zu viele Verantwortlichkeiten, schwer testbar |
| 🟡 3 | `src/components/flow-builder/StateForm.tsx` (393 LOC) | Hardcoded Tool-Liste (Stubs als wählbare Optionen), wird durch Sub-Agent-Felder stark erweitert — UI-Komplexität wächst linear mit Refactor |

### Inkrementell oder Neu-Schreiben?

**Empfehlung: Inkrementell — aber mit klarer Layer-Grenze.**

**Behalten (gut designt, nicht anfassen):**
- Job-Queue + Idempotenz-Tracking
- Provider-Registry + Fallback-Mechanismus
- Messaging-Dispatcher (sendMessage / sendAIResponse)
- Tool-Registry + Tool-Definitionen
- Memory-System (extractor / resolver / updater)

**Neu schreiben (minimaler Eingriff, maximaler Effekt):**

`orchestration/index.ts` → **Supervisor + State-Agent Pattern:**

```
Job: process_message
  → SupervisorAgent.route(conversationId, message)
      → Lade Conversation + State
      → StateAgent(state.agentRole, state.agentSystemPrompt)
          → buildSystemPrompt() [state-specific overrides]
          → aiRegistry.execute() + usageLog.create()   ← Fix Bug hier
          → tools.execute()
          → evaluateHandoffRules(state.handoffRules)
              → transitionState(targetStateId, reason)
      → AgentRun.create()  ← neue Tabelle
      → ExecutionLog.create()
```

**Migration-Strategie:** Feature-Flag `Board.useSubAgents: Boolean` — schrittweise Boards umstellen. Alter `orchestrate()` als Fallback bis Parität erreicht. Kein Big-Bang.

**Neue Schema-Felder die gebraucht werden:**
- `State.agentSystemPrompt` — State-spezifischer Prompt-Override
- `State.agentGoal` — Ziel für Supervisor-Routing
- `State.agentRole` — z.B. "qualifier", "closer", "support"
- `State.handoffRules` — JSON Array `[{condition, targetStateId, reason}]`
- `AgentRun` Tabelle — jeder LLM-Call als eigener Datensatz

---

*Ende des Audit Reports*  
*Read-only — keine Code-Änderungen wurden vorgenommen*
