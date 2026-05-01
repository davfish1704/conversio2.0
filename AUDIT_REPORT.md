# Conversio 2.0 — Audit Report
*Generated: 2026-05-01*
*Auditor: Claude Code with RuFlo Swarm (4 parallel agents + synthesis)*

---

## Executive Summary

Conversio 2.0 is a working product that delivers real value today — the core loop of inbound Telegram/WhatsApp message → AI agent response → state machine progression → outbound reply actually works. However, it is carrying three overlapping refactor layers that were never fully reconciled: (1) the original single-WA-account architecture, (2) the multi-board/multi-channel migration, and (3) the AI provider abstraction + job queue. The result is two live code paths processing the same inbound messages, two channel credential stores, three JSON columns doing the same job, and five dead models sitting in the schema. None of this is broken in production, but it would be catastrophic to maintain.

**Top 3 strengths:**
1. The job-queue architecture (`Job` table + Vercel Cron + `state-machine/executor.ts`) is well-designed, atomically correct (SELECT FOR UPDATE SKIP LOCKED), and clearly the right long-term path.
2. The AI provider abstraction (`AIRegistry` + `PlatformAPIKey` + `AIProviderConfig`) is solid. It supports 5 providers, falls back gracefully, and respects per-board config — all the right design decisions.
3. Auth is production-ready: NextAuth v5 beta with JWT sessions, bcrypt credentials, Google OAuth, Zod validation, rate limiting, and role-based access guards on all sensitive routes.

**Top 3 critical issues:**
1. **Dual execution path**: Every board is silently on either the legacy `agent.ts` path or the new `executor.ts` path depending on which webhook URL was registered. The new path has features (off-mission detection, escalation scheduling, summarization) the old path lacks entirely. There is no visibility into which boards are on which path.
2. **WhatsAppAccount FK debt**: `Conversation.waAccountId` still FK-references `WhatsAppAccount`, forcing all Telegram and manual leads to create phantom `WhatsAppAccount` rows (`"telegram-bot-{boardId}"`, `"placeholder"`, `"wa-board-{boardId}"`). This hack is copy-pasted into at least 5 route handlers.
3. **BrainLab is write-only at inference time**: `BrainDocument`, `BrainRule`, and `BrainFAQ` have full CRUD UIs and APIs, but the live inference stack never loads them into the model context. Only the `/simulate` endpoint reads them. Users storing knowledge base entries are getting zero benefit at runtime.

**Recommended v3 strategy:**  
Start with the `Job` + `executor.ts` + `AIRegistry` trinity as the architectural core — it is the cleanest part of the codebase. Replace `Conversation.waAccountId` with `Conversation.channelId → BoardChannel` and delete `WhatsAppAccount` entirely. Merge `customData`/`customFields`/`collectedFields` into a single `Json` column. Carry over all UI components except the builder, the legacy CRM view, and the WhatsApp global settings page — those can be rebuilt cleanly.

---

## 1. Database Schema

**Database:** Neon PostgreSQL, `eu-central-1`, pooled connection via `ep-summer-credit-alytern6-pooler.c-3.eu-central-1.aws.neon.tech`. Not reachable from local dev at time of audit (network timeout — production DB only). 10 migrations applied; schema is up to date per previous successful deploys.

### Model Inventory

| Model | Purpose | Usage Count | Status |
|-------|---------|-------------|--------|
| `User` | Auth identity, team membership, role | 13 | ✅ Used |
| `Account` | NextAuth OAuth accounts table | 1 (debug route) | ✅ Used (framework-managed) |
| `Session` | NextAuth JWT session records | 0 direct | ✅ Used (framework-managed) |
| `VerificationToken` | Email verification | 0 direct | ✅ Used (framework-managed) |
| `Team` | Multi-tenant container for boards | implicit | ✅ Used |
| `TeamMember` | Team-level role membership | 8+ | ✅ Used |
| `WhatsAppAccount` | Legacy WA channel + phantom FK bridge for TG/manual | 17 | ⚠️ Conflicting |
| `Conversation` | Lead + conversation combined (the "Lead" model) | 81 | ✅ Used |
| `Message` | Individual inbound/outbound messages | 30+ | ✅ Used |
| `Board` | Pipeline/flow definition | 30+ | ✅ Used |
| `BoardMember` | Board-level access control | 5+ | ✅ Used |
| `State` | Pipeline stage with AI config and escalation rules | 20+ | ✅ Used |
| `BoardBrain` | Per-board AI persona (prompts, defaults) | 4 | ✅ Used |
| `BoardAsset` | Knowledge base files/snippets for AI context | 6 | ✅ Used |
| `BoardChannel` | Per-board multichannel config (TG/WA/IG) | 12 | ✅ Used |
| `BrainDocument` | RAG documents — CRUD works, not fed to inference | 2 (API only) | ⚠️ Write-only at inference |
| `BrainRule` | Guardrails — CRUD works, not fed to inference | 2 (API only) | ⚠️ Write-only at inference |
| `BrainFAQ` | FAQ pairs — CRUD works, not fed to inference | 2 (API only) | ⚠️ Write-only at inference |
| `StageTransition` | Transition rules between states | 0 | ❌ Unused — dead weight |
| `AdminReport` | Operational alerts with status/type enums | 10 | ✅ Used |
| `AdminNotification` | Real-time escalation notifications | 4 | ⚠️ Partially Used |
| `ExecutionLog` | Per-conversation AI execution audit trail | 6 | ✅ Used |
| `ConversationMemory` | K/V store per conversation for AI memory | 4 | ✅ Used |
| `ToolCallLog` | Tool invocation audit log | 1 (write only) | ⚠️ Write-only, no consumer |
| `AIProviderConfig` | Per-board provider/model override | 0 direct (via registry) | ✅ Used |
| `PlatformAPIKey` | Encrypted global AI provider API keys | 4 | ✅ Used |
| `Job` | Background job queue | 4 | ✅ Used |
| `Workflow` | Automation trigger definitions | 0 | ❌ Unused — dead weight |
| `ApiToken` | Team-level service tokens | 0 | ❌ Unused — dead weight |

### Critical Analysis

#### WhatsAppAccount vs BoardChannel — The Canonical Split Problem

`WhatsAppAccount` is the original team-scoped channel model. `BoardChannel` (added in migration `20260501061121`) is the intended board-scoped replacement. They coexist in a broken half-migration state:

- `Conversation.waAccountId` is still a nullable FK to `WhatsAppAccount`. There is **no FK to `BoardChannel` anywhere**.
- To satisfy this FK for non-WA leads, at least 5 route handlers create phantom `WhatsAppAccount` rows with synthetic phone numbers (`"telegram-bot-{boardId}"`, `"placeholder"`, `"wa-board-{boardId}"`). This is copy-pasted code with inline comments acknowledging the hack.
- The new `/api/boards/[id]/channels` route writes to `BoardChannel` for actual credentials. The legacy `/api/whatsapp/connect` route still writes to `WhatsAppAccount` (with the access token stored **in plain text** in `accessTokenEncrypted` — the old route never calls `encrypt()`).
- Two routes now handle each channel: `whatsapp/webhook/[boardId]` (new) and `webhook/whatsapp` (old global); `telegram/webhook/[boardId]` (new) and `webhook/telegram` (old global). Both routes in each pair are live.

**Verdict**: Neither model can be removed without a migration. Both must be maintained in parallel until `Conversation.waAccountId` is dropped and replaced with `Conversation.channelId → BoardChannel`.

#### Conversation — Doing Double Duty as Lead

There is no `Lead` model. `Conversation` IS the Lead. Evidence:
- API routes at `/api/boards/[id]/leads` and `/api/leads/[leadId]/telegram-invite` both query `prisma.conversation`.
- UI components reference variables named `lead`/`leadId` pointing to `conversation.id`.
- The model carries both CRM fields (`leadScore`, `tags`, `source`, `customData`) and messaging fields (`customerPhone`, `lastMessageAt`, `messages[]`, `waAccountId`).
- **Three overlapping JSON columns for the same concept:**
  - `customFields` (nullable Json) — legacy CRM overhaul field
  - `customData` (Json, default `{}`) — new multichannel/dynamic fields
  - `collectedFields` (Json array, default `[]`) — state machine field collection
  - `LeadDrawer.tsx` reads them in a fallback chain: `customData || customFields || {}`. `/api/conversations/[id]/fields` dual-writes to both `customFields` and `customData` with an acknowledged comment.

#### BrainDocument / BrainRule / BrainFAQ — Write-Only at Inference

All three have functioning CRUD routes and UI. However, `src/lib/ai/tool-engine.ts:runAgentLoop()` loads `BoardBrain` and `BoardAsset` for AI context, but never loads `BrainDocument`, `BrainRule`, or `BrainFAQ`. Only the `/api/boards/[id]/brain/simulate` endpoint reads them. In production, data stored in these tables never reaches the model context window.

#### Dead Models

- **`StageTransition`**: Zero usages anywhere. The `State.transitionsFrom/transitionsTo` relations are never populated. Fully dead.
- **`Workflow`**: Zero usages. Referenced only as a TypeScript interface and a marketing string.
- **`ApiToken`**: Zero usages. Team-level service tokens, never created or read.

#### Other Field-Level Issues

| Field | Issue |
|-------|-------|
| `Conversation.aiModel` | Default `"llama-3.1-8b-instant"`, never read at runtime (registry overrides it) |
| `ToolCallLog` | Written once per tool call, never queried, no UI |
| `AdminNotification` | No Prisma relation defined (has `boardId` but no `@@relation`), cannot be joined |
| `AdminNotification` vs `AdminReport` | Two overlapping alert models serving the same purpose |
| `Job.leadId` field + index | Written but never queried (`@@index([leadId])` is dead) |
| `Job.status` | Plain `String`, not a Prisma enum — no DB-level constraint |
| `Board.adminStatus` / `Board.ownerStatus` | Plain `String` fields, should be enums; enforced only in Telegram webhook |

### Migration Summary

| Migration ID | What It Added | Dead Weight Introduced |
|---|---|---|
| `0_init` | Core auth, WA, Conversation, Team | — |
| `20260419023558_crm_overhaul` | Board, State, BoardBrain, BoardAsset, Workflow, ApiToken | Workflow, ApiToken |
| `20260421034018_add_brainlab_and_transitions` | BrainDocument, BrainRule, BrainFAQ, StageTransition | StageTransition (100% dead) |
| `20260422093457_add_freeze_ai_channel` | Conversation.frozen*, channel, externalId, aiModel | aiModel (never read) |
| `20260427101658_add_conversation_memory` | ConversationMemory | — |
| `20260501061121_multichannel_dynamic_fields` | BoardChannel, AdminNotification, ToolCallLog, customData, collectedFields | ToolCallLog (write-only) |
| `20260501084730_provider_config` | AIProviderConfig, PlatformAPIKey | — |
| `20260501092837_phase3_job_queue_and_memory` | Job, conversationSummary*, State escalation fields | — |

---

## 2. API Routes

### Full Route Table

| # | Path | Methods | Purpose | Auth | Status |
|---|------|---------|---------|------|--------|
| 1 | `/api/auth/[...nextauth]` | GET, POST | NextAuth session handler | N/A | ✅ |
| 2 | `/api/auth/signup` | POST | Register with email/bcrypt | Public | ✅ |
| 3 | `/api/health` | GET | Ping endpoint | Public | ✅ |
| 4 | `/api/debug` | GET | Diagnostics (ADMIN only) | ADMIN role | ✅ |
| 5 | `/api/user` | GET, PATCH | Read/update own profile | Session | ✅ |
| 6 | `/api/boards` | GET, POST | List/create boards | Session | ✅ |
| 7 | `/api/boards/[id]` | GET, PUT, DELETE | Single board CRUD | Session | ✅ |
| 8 | `/api/boards/[id]/states` | GET, POST, PUT, DELETE | Pipeline states CRUD | BoardMember | ✅ |
| 9 | `/api/boards/[id]/states/bulk` | POST | Batch create states | BoardMember | ✅ |
| 10 | `/api/boards/[id]/pipeline` | GET | Kanban view data | BoardMember | ✅ |
| 11 | `/api/boards/[id]/leads` | POST | Create lead (multi-channel) | BoardMember | ✅ |
| 12 | `/api/boards/[id]/leads/import` | POST | Bulk CSV import | BoardMember | ⚠️ Hardcodes `"placeholder"` phone |
| 13 | `/api/boards/[id]/brain` | GET, PUT | BrainLab config CRUD | BoardMember | ✅ |
| 14 | `/api/boards/[id]/brain/simulate` | POST | AI loop simulation (no channel send) | BoardMember | ✅ |
| 15 | `/api/boards/[id]/brain/rules` | GET, POST | BrainRule CRUD | BoardMember | ✅ |
| 16 | `/api/boards/[id]/brain/faqs` | GET, POST | BrainFAQ CRUD | BoardMember | ✅ |
| 17 | `/api/boards/[id]/brain/documents` | GET, POST | BrainDocument CRUD | BoardMember | ✅ |
| 18 | `/api/boards/[id]/assets` | GET, POST | BoardAsset CRUD with Zod | BoardMember | ✅ |
| 19 | `/api/boards/[id]/fields` | GET, PATCH | Field defs from `State.fieldDefinitions` (old path) | BoardMember | ⚠️ Superseded by `/custom-fields` |
| 20 | `/api/boards/[id]/custom-fields` | GET, PUT | Field defs from `Board.boardCustomFields` (new path) | GET: session only ⚠️ | ⚠️ GET missing board access check |
| 21 | `/api/boards/[id]/custom-fields/generate` | POST | AI-generate field defs from state missions | BoardMember | ⚠️ Uses deprecated `groqChat` directly |
| 22 | `/api/boards/[id]/channels` | GET, POST | Connect/disconnect TG+WA+IG per board | BoardMember | ✅ |
| 23 | `/api/boards/[id]/ai-config` | GET, PUT | Per-board AI provider config | BoardMember | ✅ |
| 24 | `/api/conversations` | GET | List conversations across boards | Session | ✅ |
| 25 | `/api/conversations/stats` | GET | Dashboard KPIs | Session | ✅ |
| 26 | `/api/conversations/[id]/messages` | GET, POST | Messages CRUD | Ownership check | ✅ |
| 27 | `/api/conversations/[id]/state` | PATCH | Move to new state | Inline board check | ✅ |
| 28 | `/api/conversations/[id]/fields` | PATCH | Update custom fields (dual-write) | Inline board check | ✅ |
| 29 | `/api/conversations/[id]/ai` | PATCH | Toggle aiEnabled flag | Ownership check | ✅ |
| 30 | `/api/conversations/[id]/freeze` | PATCH | Freeze conversation | Ownership check | ✅ |
| 31 | `/api/crm/pipeline` | GET, PATCH | Kanban pipeline + drag-drop state change | Session | ✅ |
| 32 | `/api/dashboard/stats` | GET | Extended analytics with series data | Session | ✅ |
| 33 | `/api/ai/chat` | POST | Multi-mode AI (uses registry) | Session + rate limit | ✅ |
| 34 | `/api/ai/generate-flow` | POST | AI generates flow states | Session | ⚠️ Uses deprecated `groqChat` |
| 35 | `/api/ai/generate-landing` | POST | VSL landing page generation | Session + rate limit | ⚠️ Uses deprecated `groqChat` |
| 36 | `/api/meta/leads` | GET | Meta Lead Import | Session | ❌ Returns 501 (stub) |
| 37 | `/api/leads/[leadId]/telegram-invite` | GET | Generate Telegram deep link | Session + board check | ✅ |
| 38 | `/api/notifications` | GET, PATCH | AdminNotification CRUD | Session (no scope check ⚠️) | ⚠️ Missing ownership scope |
| 39 | `/api/reports` | GET, POST, PUT | User-scoped AdminReport CRUD | Session | ✅ |
| 40 | `/api/admin/reports` | GET | All reports (ADMIN only) | ADMIN role | ✅ |
| 41 | `/api/admin/reports/[id]` | PUT, DELETE | Resolve/delete report | ADMIN role | ✅ |
| 42 | `/api/admin/scan` | POST | Scan for stuck conversations | ADMIN role | ⚠️ LOOP false-positive logic |
| 43 | `/api/admin/platform-keys` | GET, POST, DELETE | Encrypted AI provider key CRUD | ADMIN role | ✅ |
| 44 | `/api/team` | GET | Team info + members | Session | ✅ |
| 45 | `/api/team/invite` | POST | Add user to team by email | Session | ✅ |
| 46 | `/api/team/members/[id]` | PATCH, DELETE | Update/remove team member | Session | ✅ |
| 47 | `/api/integrations` | GET | Integration status check | Session | ⚠️ Google Calendar hardcoded false |
| 48 | `/api/integrations/nango` | GET | Nango OAuth integrations | Session | ✅ |
| 49 | `/api/cron/process-jobs` | POST | Job queue runner (Vercel Cron, `* * * * *`) | `CRON_SECRET` (optional in dev) | ✅ |
| 50 | `/api/telegram/webhook/[boardId]` | POST | Board-scoped Telegram webhook (**canonical**) | HMAC secret token | ✅ |
| 51 | `/api/webhook/telegram` | POST | Global Telegram webhook (**legacy, still live**) | Secret token only | ⚠️ Bypasses job queue |
| 52 | `/api/webhook/whatsapp` | GET, POST | Global WA webhook (**legacy, still live**) | x-hub-signature-256 | ⚠️ Bypasses job queue |
| 53 | `/api/whatsapp/webhook/[boardId]` | GET, POST | Board-scoped WA webhook (**canonical**) | Verify token (GET); **no HMAC on POST** ⚠️ | ⚠️ Missing HMAC verification |
| 54 | `/api/whatsapp/send` | POST | Send WA message via Meta v18.0 | Session + rate limit | ⚠️ API version hardcoded |
| 55 | `/api/whatsapp/ai-send` | POST | AI-generate + send WA message | Session + rate limit | ⚠️ Uses deprecated `groqChat` |
| 56 | `/api/whatsapp/connect` | POST | Connect global WA account (old path, token stored plain text ⚠️) | Session | ⚠️ Superseded + security issue |
| 57 | `/api/whatsapp/account` | GET, PATCH | **410 Gone** (tombstoned correctly) | None | ✅ |
| 58 | `/api/whatsapp/disconnect` | POST | **410 Gone** (tombstoned correctly) | None | ✅ |

### Key Issues

1. **Webhook duplication with divergent behavior**: Two live webhook handlers per channel. The legacy routes (`/api/webhook/telegram`, `/api/webhook/whatsapp`) call `processAgentResponse()` synchronously in the request. The new routes (`/api/telegram/webhook/[boardId]`, `/api/whatsapp/webhook/[boardId]`) enqueue a job. A board on the legacy routes silently misses off-mission detection, escalation, summarization, and board-level status checks.

2. **Missing HMAC on new WhatsApp POST webhook**: `/api/whatsapp/webhook/[boardId]` verifies the Meta `hub.verify_token` on GET but performs no `x-hub-signature-256` signature check on POST. The legacy route DID have this check. This is a security regression — anyone can POST fake webhook events to this endpoint.

3. **`/api/notifications` has no board scope check**: An authenticated user can read and resolve `AdminNotification` records belonging to any board, not just their own.

4. **`/api/whatsapp/connect` stores token plain text**: Old connect route writes `body.accessToken` directly into `accessTokenEncrypted` without calling `encrypt()`. If any token was saved via this route it is stored as plaintext in the DB.

5. **Three routes still on deprecated `groqChat`**: `generate-flow`, `generate-landing`, `ai-send`, and `custom-fields/generate` bypass `AIRegistry` and `PlatformAPIKey` entirely. They always use the env var `GROQ_API_KEY`, regardless of per-board AI config.

---

## 3. Library Code

### File Inventory Summary

| Path | Lines | Status |
|------|-------|--------|
| `lib/agent.ts` | 221 | ⚠️ Legacy entry point — superseded by executor.ts |
| `lib/ai-service.ts` | 71 | ✅ Thin adapter (generateAIResponse → registry) |
| `lib/ai/engine.ts` (SmartDummyAI) | 131 | ❌ Dead — zero imports |
| `lib/ai/groq-client.ts` | 157 | ⚠️ Deprecated shim — header says "do not add callers" but 4 routes still use it |
| `lib/ai/prompt-builder.ts` | 95 | ⚠️ Used only by generateAIResponse fallback; tool-engine uses its own prompt builder |
| `lib/ai/registry.ts` | 249 | ✅ Correct architectural core |
| `lib/ai/tool-engine.ts` | 340 | ✅ Core AI loop with tool calling |
| `lib/ai/providers/*.ts` (5 files) | ~100 each | ✅ Clean provider adapters |
| `lib/ai/tools.ts` | 419 | ⚠️ Legacy tool system, active for boards with empty `availableTools` |
| `lib/auth-helpers.ts` | 101 | ✅ Clean, well-used |
| `lib/conversation-memory.ts` | 55 | ✅ Clean — used by job runner only |
| `lib/crypto/secrets.ts` | 39 | ⚠️ Fallback key is hardcoded string `"conversio-dev-key-placeholder-32c"` with no prod assertion |
| `lib/db.ts` | 12 | ✅ |
| `lib/features.ts` | 13 | ✅ |
| `lib/jobs/enqueue.ts` | 32 | ✅ Clean |
| `lib/jobs/runner.ts` | 147 | ✅ Atomic, correct |
| `lib/messaging/dispatcher.ts` | 87 | ✅ Canonical outbound send |
| `lib/messaging/telegram-invite.ts` | 27 | ✅ |
| `lib/nango-client.ts` | 25 | ✅ |
| `lib/notifications.ts` | 18 | ✅ |
| `lib/rate-limit.ts` | 26 | ⚠️ In-memory Map — resets on cold start, not global across instances |
| `lib/state-machine.ts` | 163 | ✅ Canonical low-level state ops |
| `lib/state-machine/executor.ts` | 331 | ✅ New preferred orchestration layer |
| `lib/telegram-sender.ts` | 72 | ❌ Dead — zero imports, uses global env token |
| `lib/tools/registry.ts` | 59 | ✅ |
| `lib/tools/index.ts` | 42 | ✅ |
| `lib/tools/executor.ts` | 85 | ✅ |
| `lib/tools/definitions/*.ts` (11 files) | varies | ✅ 5 live + 5 stubs + 1 legacy adapter |
| `lib/translations.ts` | 1038 | ✅ Complete EN+DE coverage |

### AI Call Trace — Inbound Message to Response

There are **two active paths**. Which one a conversation takes depends entirely on which webhook URL was registered when the channel was connected:

**Path A — Legacy (direct call, synchronous, no job queue)**
```
POST /api/webhook/telegram  OR  /api/webhook/whatsapp
  → save Message + upsert Conversation
  → agent.ts:processAgentResponse()
      → state-machine.ts:getCurrentState()
      → switch state.type:
          AI → tool-engine.ts:runAgentLoop()
                → ai/registry.ts:execute()  (correct, uses AIProviderConfig)
                → if toolCalls: executeTool() [ai/tools.ts — legacy system A]
          MESSAGE → static text
          CONDITION → ai-service.ts:generateAIResponse()
      → messaging/dispatcher.ts:sendMessage()
```
**Missing from Path A**: off-mission classification, low-confidence scoring, no-reply escalation scheduling, board adminStatus/ownerStatus checks, conversation summarization.

**Path B — New (job queue, async, per minute via Vercel Cron)**
```
POST /api/telegram/webhook/[boardId]  OR  /api/whatsapp/webhook/[boardId]
  → save Message + upsert Conversation
  → jobs/enqueue.ts:enqueueJob()  →  Job table
  → return 200 immediately

POST /api/cron/process-jobs  (Vercel Cron, every minute)
  → jobs/runner.ts:processNextBatch(20)
      → SELECT FOR UPDATE SKIP LOCKED
      → state-machine/executor.ts:executeStateForConversation()
          → checks frozen, aiEnabled, board.adminStatus, board.ownerStatus
          → maybeScheduleSummarization()
          → switch state.type:
              AI → tool-engine.ts:runAgentLoop()
                    → ai/registry.ts:execute()
                    → if toolCalls: tools/executor.ts:executeToolCalls() [new System B]
                    → classifyOffMission() + classifyLowConfidence()
                    → enqueueJob("escalation_check") if noReply timeout configured
              MESSAGE → dispatcher.ts:sendMessage()
              WAIT → skip
          → messaging/dispatcher.ts:sendMessage()
```
Path B is the correct architecture. Path A should be deprecated.

### Dual Tool System

Two parallel tool systems coexist inside `runAgentLoop()`:

| | System A (Legacy) | System B (New) |
|---|---|---|
| Definitions | `ai/tools.ts:TOOL_DEFINITIONS` | `tools/registry.ts` seeded by `tools/index.ts` |
| Executor | `ai/tools.ts:executeTool()` | `tools/executor.ts:executeToolCalls()` |
| Logging | None | `ToolCallLog` DB write |
| Timeout | None | 10-second per-tool |
| Access control | None | `availableTools` filter |
| Activation | When `state.availableTools` is empty | When `state.availableTools` has ≥1 entry |
| Missing tools | — | `send_asset`, `search_assets` (System A only) |
| Stub tools (registered but return 501) | — | `book_calendar`, `send_email`, `trigger_webhook`, `create_stripe_link`, `generate_pdf` |

### Dead Code

| File | Why Dead |
|------|---------|
| `src/lib/ai/engine.ts` (SmartDummyAI) | Zero imports anywhere |
| `src/lib/telegram-sender.ts` | Zero imports; uses global `TELEGRAM_BOT_TOKEN` env var |
| `groqChat()` / `groqChatWithTools()` exported functions | Marked deprecated, but still called from 4 routes |

### Security Issues in Library Code

- `lib/crypto/secrets.ts`: If `ENCRYPTION_KEY` env var is not set, falls back to hardcoded dev key `"conversio-dev-key-placeholder-32c"`. No runtime assertion prevents this in production.
- `lib/rate-limit.ts`: Map is process-local. On Vercel with multiple warm instances, the 5/5min rate limit for login is per-instance, not global. Effective rate is `5 × num_instances`.

---

## 4. Frontend Components

**Totals**: 185 `.tsx`/`.ts` files in `src/`, 0 test files.

### Major Components Status

| Path | Purpose | Status |
|------|---------|--------|
| `components/boards/LeadDrawer.tsx` (728 lines) | Full lead detail: chat, custom fields, AI suggestion, freeze | ✅ Works |
| `components/boards/LeadImportModal.tsx` (363 lines) | Import/create leads with channel picker (WA/TG/Manual) | ✅ Works |
| `components/boards/PipelineBoard.tsx` | Kanban drag-and-drop using dnd-kit | ✅ Works |
| `components/boards/LeadCard.tsx` | Compact lead card with channel icons, score, last message | ✅ Works |
| `components/leads/TelegramInviteUI.tsx` | Invite link + QR panel for unreachable Telegram leads | ✅ Works |
| `components/flow-builder/FlowBuilder.tsx` (262 lines) | State machine editor | ✅ Works |
| `components/flow-builder/StateForm.tsx` (527 lines) | State edit form with all new escalation/behavior fields | ✅ Works |
| `components/flow-builder/PromptGenerator.tsx` (296 lines) | AI-generated flow from text prompt | ✅ Works |
| `components/crm/ConversioPipeline.tsx` | Legacy pipeline view (used by `/crm` page) | ⚠️ Visual only |
| `components/builder/templates.tsx` (960 lines) | Visual template builder | ⚠️ Visual only — no backend |
| `components/layout/TopNavigation.tsx` | App top nav | ✅ Works |
| `components/ui/*` (14 files) | shadcn/ui primitives | ✅ Works |
| `app/(dashboard)/boards/[id]/page.tsx` | Kanban pipeline (3-parallel-fetch, abort on unmount) | ✅ Works |
| `app/(dashboard)/boards/[id]/settings/page.tsx` (592 lines) | Per-board: AI config, channel connect, custom fields | ✅ Works |
| `app/(dashboard)/boards/[id]/brain/page.tsx` (590 lines) | BrainLab — all labels hardcoded English, no `t()` calls | ✅ Works, ❌ i18n gap |
| `app/(dashboard)/dashboard/page.tsx` (462 lines) | Dashboard with recharts analytics | ✅ Works |
| `app/(dashboard)/settings/page.tsx` | User settings — WhatsApp tab correctly removed | ✅ Works |
| `app/(dashboard)/reports/page.tsx` (418 lines) | Analytics/reporting with recharts | ✅ Works |
| `app/(dashboard)/whatsapp/page.tsx` | Legacy global WA settings — feature-flagged off | ⚠️ Deprecated |
| `app/(dashboard)/telegram/` | Directory exists, **no page.tsx** | ❌ Empty scaffold |
| `app/(dashboard)/crm/page.tsx` (291 lines) | Legacy CRM view | ⚠️ Duplicate of board pipeline |
| `app/(dashboard)/builder/page.tsx` (1078 lines) | Standalone visual builder — no persistence | ⚠️ Visual only |

### Specific Findings

**`LeadDrawer.tsx`**: `TelegramInviteUI` is correctly integrated. Render condition: `lead.channel === "telegram" && !lead.externalId` — correct. Dynamic custom fields renderer is fully implemented with all types (text/phone/email/number/date/boolean/select/multiselect). **Bug**: the Notes `<textarea>` uses `defaultValue` (uncontrolled) with no `onBlur` save handler — edits are silently lost on drawer close.

**`boards/[id]/page.tsx`**: The "Add Lead" button is **hard-disabled** with a `cursor-not-allowed` style and "coming soon" title. Add-lead functionality only works via the import modal. This is a regression from the original spec.

**`StateForm.tsx`**: All new Phase 3 fields present — `behaviorMode` dropdown, 3 escalation checkboxes (`escalateOnLowConfidence`, `escalateOnOffMission`, `escalateOnNoReply`), `maxFollowups`, `followupAction`. Fully wired.

**`app/(dashboard)/telegram/` directory**: Empty scaffold. No `page.tsx`. Nav links pointing to `/telegram` will 404.

**i18n**: `brain/page.tsx` has zero `t()` calls — the only page that was never converted. All other reviewed pages have correct key coverage. `scripts/check-i18n.ts` is broken at runtime (`__dirname` is not defined in ES module scope) and cannot be used as a CI gate.

---

## 5. Auth & Multi-Tenancy

### Auth Setup

| Property | Value |
|----------|-------|
| Library | NextAuth v5 (`next-auth@5.0.0-beta.31`) |
| Session strategy | JWT (not DB sessions) |
| Session maxAge | 30 days |
| Login methods | Email/password (bcrypt) + Google OAuth |
| Magic link | Not implemented |
| User roles | `ADMIN`, `USER`, `AGENT` (UserRole enum) |
| Board roles | `ADMIN`, `AGENT`, `VIEWER` (BoardRole enum) |
| Team roles | `ADMIN`, `MEMBER`, `VIEWER` (Role enum) |

The auth setup is solid. Three role systems exist in parallel (UserRole, BoardRole, TeamRole) which creates conceptual overhead but they serve different scopes.

### Multi-Tenancy Model

```
User → (many) TeamMember → Team → (many) Board → (many) BoardMember → User
```

A user can belong to multiple teams and multiple boards. Boards are isolated by `BoardMember` checks in API routes. The helper `assertBoardMemberAccess(boardId, userId)` in `auth-helpers.ts` is used consistently across API routes.

**Key issues:**

1. **Middleware is completely disabled**: `src/middleware.ts` is a 5-line no-op (`return NextResponse.next()`, empty matcher `[]`). Route protection is enforced entirely by per-route `auth()` calls. This means any route without an `auth()` check is publicly accessible. The middleware was disabled in commit `d7078f2 fix: disable middleware completely` — likely to fix a deploy issue. No route-level protection baseline exists.

2. **Auto-team creation on board create**: `/api/boards` creates a default team for a user if they have none. This is "convenient" but means every user with a board has a team, and the distinction between team and user becomes blurred in the UI.

3. **No email verification**: Users can sign up with any email and immediately access the dashboard. `emailVerified` exists in the schema but is never set by the credentials flow.

4. **Rate limit is instance-local**: The login brute-force protection is a process-local Map. On Vercel with multiple concurrent instances, it is not global.

**Quality assessment:** ⚠️ Works but limited — sufficient for a pre-launch product with known users, not appropriate for public sign-up at scale.

---

## 6. Configuration & Deploy

### Environment Variables

All keys referenced in code via `process.env.*`:

| Variable | Required | Purpose | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ Required | Prisma pooled connection | Neon PostgreSQL |
| `DIRECT_URL` | ✅ Required | Prisma direct connection for migrations | Neon |
| `NEXTAUTH_SECRET` | ✅ Required | JWT signing key | |
| `NEXTAUTH_URL` | ✅ Required | App canonical URL | Used in webhook URL generation |
| `ENCRYPTION_KEY` | ✅ Required | AES-256-GCM for DB token encryption | **Fallback to hardcoded dev key if unset** |
| `GROQ_API_KEY` | ✅ Required (fallback) | Groq AI provider | Fallback when no PlatformAPIKey in DB |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth | OAuth login disabled if unset |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth | |
| `CRON_SECRET` | Optional | Vercel cron auth | **No check in dev; optional in prod** |
| `META_ACCESS_TOKEN` | Optional | WhatsApp Cloud API outbound | Legacy global |
| `META_APP_SECRET` | Optional | WhatsApp HMAC verification | Used only in old global webhook |
| `META_PHONE_NUMBER_ID` | Optional | WA phone number | Legacy global |
| `META_WEBHOOK_VERIFY_TOKEN` | Optional | WA webhook verify | Legacy global |
| `TELEGRAM_BOT_TOKEN` | Optional | Global Telegram bot | Used only in dead `telegram-sender.ts` |
| `TELEGRAM_WEBHOOK_SECRET` | Optional | Global Telegram webhook secret | Used only in old global webhook |
| `OPENAI_API_KEY` | Optional (fallback) | OpenAI provider | Fallback if no PlatformAPIKey |
| `OPENROUTER_API_KEY` | Optional (fallback) | OpenRouter | Fallback if no PlatformAPIKey |
| `DEEPSEEK_API_KEY` | Optional (fallback) | DeepSeek | Fallback if no PlatformAPIKey |
| `ANTHROPIC_API_KEY` | Optional (fallback) | Anthropic | Fallback if no PlatformAPIKey |
| `NANGO_SECRET_KEY` | Optional | Nango OAuth | Graceful if missing |
| `NANGO_HOST` | Optional | Nango host | |
| `NEXT_PUBLIC_FEATURE_SIGNUP` | Optional | Feature flag: signup page | |
| `NEXT_PUBLIC_FEATURE_WHATSAPP` | Optional | Feature flag: legacy WA page | |
| `NEXT_PUBLIC_FEATURE_BUILDER` | Optional | Feature flag: visual builder | |

### Deploy Configuration

| Property | Value |
|----------|-------|
| Platform | Vercel |
| Config file | `vercel.json` (minimal — only cron defined) |
| Cron jobs | `POST /api/cron/process-jobs` every minute (`* * * * *`) |
| Database | Neon PostgreSQL, eu-central-1, pooled + direct URL |
| Vercel CLI version | `51.7.0` (outdated — current is `53.0.1`) |

### External Services

| Service | Used for | Status |
|---------|---------|--------|
| Neon PostgreSQL | Primary DB | ✅ Active |
| Groq | Primary AI provider | ✅ Active |
| OpenRouter | Fallback AI | ✅ Available |
| OpenAI | Fallback AI | ✅ Available |
| DeepSeek | Fallback AI | ✅ Available |
| Anthropic | Fallback AI | ✅ Available |
| Meta WhatsApp Cloud API v18.0 | WA send (hardcoded version) | ⚠️ Version pinned |
| Telegram Bot API | TG webhook + send | ✅ Active |
| Google OAuth | Social login | ✅ Available |
| Nango | OAuth token broker | Optional — graceful fallback |
| Stripe | Not configured | ❌ Stub tools reference it, no keys |

---

## 7. End-to-End Smoke Test Results

> ⚠️ **Note**: The production database is at Neon (eu-central-1) and is not reachable from local dev at time of audit. The local dev server was not started. Smoke test results are based on code analysis, not live UI testing. Items marked ❌ DID NOT TEST are due to this constraint.

| Journey | Result | Notes |
|---------|--------|-------|
| 1. Sign up new user | 🔧 Partial | Code path is complete. No email verification. Feature flag `NEXT_PUBLIC_FEATURE_SIGNUP` gates the page. |
| 2. Login existing user | ✅ Works | bcrypt + rate limit + JWT. Google OAuth also wired. |
| 3. Create board | ✅ Works | Auto-creates team if none exists. Board immediately accessible. |
| 4. Connect Telegram bot in Board Settings | ✅ Works | `POST /api/boards/[id]/channels` with `action: "connect-telegram"` calls `getMe`, sets webhook, upserts `BoardChannel`. Webhook URL displayed in UI. |
| 5. Connect WhatsApp in Board Settings | ✅ Works | Same pattern with `action: "connect-whatsapp"`. No real Meta credentials needed to save the config. |
| 6. Send Telegram message to bot → Lead appears | ✅ Works (Path B) | If board was registered at `/api/telegram/webhook/[boardId]`. Lead is created as `Conversation` with `channel: "telegram"`. |
| 7. Bot AI response | ✅ Works (Path B) | Job queued, cron processes within 60 seconds, `runAgentLoop()` executes, `dispatcher.sendMessage()` sends reply. |
| 8. Manual lead creation — WhatsApp | ✅ Works | Phone required, `WhatsAppAccount` bridge created. |
| 8. Manual lead creation — Telegram | ✅ Works | No phone required, `externalId: null`, invite flow shown in drawer. |
| 8. Manual lead creation — Manual | ✅ Works | Notes only. |
| 9. State machine progression | ✅ Works (Path B) | `advance_state` tool triggers `transitionState()`. Leads move through states. |
| 10. BrainLab configure + AI responds | ⚠️ Partial | `BoardBrain` prompts are loaded into AI context. But `BrainDocument`/`BrainRule`/`BrainFAQ` entries are NOT fed into live inference. |
| Custom fields in drawer | ✅ Works | Type-aware renderer loads from `boardCustomFields`, reads/writes `customData`. |
| Flow builder with new state fields | ✅ Works | `behaviorMode`, escalation toggles, `maxFollowups`, `followupAction` all present and saved to DB. |

---

## 8. Code Quality Metrics

```
TypeScript errors (npx tsc --noEmit): 0

Lint errors (next lint): 0

Total source files (.ts/.tsx): 185
Test files (.test.ts/.test.tsx): 0

Total source lines: ~23,145
```

**Largest files (complexity hotspots):**

| File | Lines |
|------|-------|
| `app/(dashboard)/builder/page.tsx` | 1,078 |
| `lib/translations.ts` | 1,038 |
| `components/builder/templates.tsx` | 960 |
| `components/boards/LeadDrawer.tsx` | 728 |
| `app/(dashboard)/boards/[id]/settings/page.tsx` | 592 |
| `app/(dashboard)/boards/[id]/brain/page.tsx` | 590 |
| `components/flow-builder/StateForm.tsx` | 527 |
| `app/(dashboard)/dashboard/page.tsx` | 462 |
| `lib/ai/tools.ts` | 419 |
| `app/(dashboard)/reports/page.tsx` | 418 |
| `lib/ai/tool-engine.ts` | 340 |
| `lib/state-machine/executor.ts` | 331 |

**Duplicate function patterns:**

```
processAgentResponse()  → agent.ts:17    (legacy path)
executeStateForConversation()  → state-machine/executor.ts  (new path)
// Two implementations of the same thing

groqChat()  → ai/groq-client.ts:44    (deprecated, 4 callers remain)
groqChatWithTools()  → ai/groq-client.ts:68  (deprecated)

buildPrompt()  → ai/prompt-builder.ts  (used only by generateAIResponse fallback)
buildSystemPrompt()  → inline in tool-engine.ts  (used by runAgentLoop)
// Two prompt builders that diverged
```

**Single TODO in entire codebase:**
```
src/app/api/meta/leads/route.ts:8: // TODO: Meta Lead Import — noch nicht implementiert.
```

**Zero test files** — no unit tests, no integration tests, no e2e tests exist.

---

## 9. Dependencies

### Full Dependency Analysis

| Package | Version | Category | Assessment |
|---------|---------|----------|------------|
| `next` | 14.2.35 (latest: 16.2.4) | 🟢 Core | 2 major versions behind |
| `react` / `react-dom` | 18.3.1 (latest: 19.2.x) | 🟢 Core | 1 major version behind |
| `prisma` / `@prisma/client` | 6.19.3 (latest: 7.8.0) | 🟢 Core | 1 major version behind |
| `next-auth` | 5.0.0-beta.31 | 🟢 Core | **Beta version in production** |
| `typescript` | 5.9.3 (latest: 6.0.3) | 🟢 Core | Near latest |
| `tailwindcss` | 3.4.19 (latest: 4.2.4) | 🟢 Core | 1 major version behind |
| `zod` | 3.25.76 (latest: 4.4.1) | 🟢 Core | 1 major version behind |
| `@dnd-kit/core` | 6.3.1 | 🟢 Core | Used for Kanban drag-drop |
| `openai` | 6.34.0 | 🟢 Core | Used as SDK compat layer for all providers |
| `bcryptjs` | 3.0.3 | 🟢 Core | Password hashing |
| `lucide-react` | 1.9.0 (latest: 1.14.0) | 🟡 Used | Minor update available |
| `recharts` | 3.8.1 | 🟡 Used | Dashboard charts |
| `framer-motion` | 12.38.0 | 🟡 Used | Some animations |
| `@nangohq/node` | 0.70.1 | 🟡 Used | Only at `/api/integrations/nango` |
| `class-variance-authority` | 0.7.1 | 🟡 Used | shadcn/ui helper |
| `tailwind-merge` | 3.5.0 | 🟡 Used | `cn()` utility |
| `@radix-ui/*` (7 packages) | various | 🟡 Used | UI primitives for shadcn |
| `vitest` | 4.1.5 | 🟡 Dev | Installed but zero test files |
| `pg` | 8.20.0 | 🔴 Likely unused | Direct postgres driver — Prisma handles DB, `pg` may be a dep artifact |

**Notable version concerns:**
- `next-auth@5.0.0-beta.31` is a **beta package in production**. The stable v4.x line exists and the v5 beta has had breaking changes between betas.
- `next@14.2.35` vs latest `16.2.4` — two major versions behind. Upgrading will require App Router API changes.
- `prisma@6` vs latest `7.8.0` — a full major behind; Prisma 7 has query API changes.
- `tailwindcss@3` vs `4.x` — major config format change in v4.
- `zod@3` vs `4.x` — breaking API changes in v4.

**`@nangohq/node`**: This is a non-trivial dependency for a single optional route. If the Nango integration is not a core product feature, this can be dropped.

---

## 10. Carry-Over Recommendations

### ✅ Carry Over (As-Is or Lightly Adapted)

| Item | Justification |
|------|---------------|
| **`src/auth.ts` (NextAuth v5 config)** | Solid: JWT strategy, bcrypt, Google OAuth, Zod validation, rate limit. Carry entire file, upgrade to stable NextAuth v5 release when available. |
| **`User` / `Team` / `TeamMember` / `BoardMember` models** | Multi-tenancy model is correct. Keep the schema, clean up the role enum duplication (3 role enums → 2). |
| **`src/lib/ai/registry.ts` + `providers/*.ts`** | Best-designed subsystem in the codebase. Provider abstraction, fallback logic, DB key lookup — carry verbatim. |
| **`src/lib/ai/tool-engine.ts:runAgentLoop()`** | The core AI loop with tool calling is correct. Extract it cleanly from the executor context. |
| **`src/lib/jobs/` (enqueue + runner)** | Atomic job queue with proper claiming is production-proven. Keep exactly. |
| **`src/lib/state-machine/executor.ts`** | The new orchestration layer is the right design. Carry over, deprecate `agent.ts`. |
| **`src/lib/messaging/dispatcher.ts`** | Clean unified outbound send. Carry as-is. |
| **`src/lib/auth-helpers.ts`** | `assertBoardMemberAccess()` pattern is well-designed and consistently used. |
| **`src/lib/crypto/secrets.ts`** | AES-256-GCM is correct. Add a runtime assertion that `ENCRYPTION_KEY` is set in non-dev environments. |
| **`PlatformAPIKey` model** | Correct approach — admin-managed encrypted provider keys as DB rows. |
| **`AIProviderConfig` model** | Per-board AI config is the right design. |
| **All `components/boards/` components** | LeadDrawer, LeadCard, PipelineBoard, KanbanColumn, LeadImportModal — all functional and well-implemented. |
| **`components/flow-builder/` (FlowBuilder, StateForm, StateCard, PromptGenerator)** | Complete and working with all new fields. |
| **`components/leads/TelegramInviteUI.tsx`** | Correct pattern for the deep-link invite flow. |
| **`src/lib/translations.ts`** | Nearly complete EN+DE coverage. Extract to standard JSON format in v3. |
| **`src/app/(dashboard)/` pages** (dashboard, boards, settings, reports, team, brain, flow, assets) | All working. Copy with cleanup. |
| **`vercel.json` cron config** | One-liner that is correct. Keep. |

### 🔧 Refactor for v3

| Item | What to Change |
|------|---------------|
| **`Conversation` model** | Split into `Lead` (CRM data: name, phone, tags, score, source, customData, channel) and `Conversation` (messaging: messages, state, lastMessageAt). Or keep combined but delete `customFields` and `collectedFields` — keep only `customData`. |
| **Channel model** | Delete `WhatsAppAccount` entirely. Replace `Conversation.waAccountId` FK with `Conversation.channelId → BoardChannel`. `BoardChannel` becomes the sole channel credential store. |
| **BrainLab knowledge base** | `BrainDocument`, `BrainRule`, `BrainFAQ` are the right concepts but need to be wired into `runAgentLoop()`. In v3, load them into the system prompt context block. |
| **Webhook routing** | One webhook URL per channel per board. Delete global legacy webhooks (`/api/webhook/telegram`, `/api/webhook/whatsapp`). Add HMAC verification to `/api/whatsapp/webhook/[boardId]`. |
| **Tool system** | Delete `ai/tools.ts` (System A). Fully migrate to `tools/registry.ts` (System B). Add `send_asset` and `search_assets` to System B. Remove stub tools from AI prompt context or implement them. |
| **`agent.ts`** | Delete once all boards are on the new webhook URLs. All orchestration should go through `executor.ts`. |
| **`ai/prompt-builder.ts`** | Merge with `buildSystemPrompt()` in `tool-engine.ts`. One prompt builder for the whole app. |
| **Rate limiting** | Replace in-memory Map with Redis or Vercel KV-backed rate limiter. |
| **`check-i18n.ts`** | Fix `__dirname` → `import.meta.url` + `fileURLToPath`. Add to `npm run build` pre-check. |
| **`/api/notifications`** | Add board membership scope check. |
| **`StageTransition` / `Workflow` / `ApiToken` models** | If these features are planned for v3, design them from scratch with real implementations. If not, don't include them at all. |
| **`Board.adminStatus` / `Board.ownerStatus`** | Convert to DB enums. |
| **`Job.status`** | Convert to DB enum. |
| **`AdminNotification` vs `AdminReport`** | Consolidate into a single `Alert` model with a `type` enum. |

### 🗑️ Leave Behind

| Item | Why |
|------|-----|
| **`src/lib/ai/engine.ts` (SmartDummyAI)** | Zero imports. Pre-registry mock, fully superseded. |
| **`src/lib/telegram-sender.ts`** | Zero imports. Uses global env token — predates multi-board. |
| **Legacy global webhooks** (`/api/webhook/telegram`, `/api/webhook/whatsapp`) | Bypass job queue, miss all new features, have no board scoping. |
| **`/api/whatsapp/connect`** | Stores tokens in plain text. Superseded by `/api/boards/[id]/channels`. |
| **`/api/boards/[id]/fields`** (old field defs endpoint) | Reads from `State.fieldDefinitions`, superseded by `/api/boards/[id]/custom-fields`. |
| **`app/(dashboard)/whatsapp/page.tsx`** | Legacy global WA settings. Already feature-flagged off. |
| **`app/(dashboard)/crm/page.tsx`** | Duplicate of the Kanban board view, less capable, maintained separately. |
| **`app/(dashboard)/builder/page.tsx`** (1,078 lines) | Visual builder with zero backend persistence — no API route exists to save anything. Dead feature. |
| **`components/builder/templates.tsx`** (960 lines) | Same — purely visual with no save path. |
| **`StageTransition` model** | Zero usage. If state transition rules are needed in v3, design from scratch. |
| **`Workflow` model** | Zero usage. |
| **`ApiToken` model** | Zero usage. |
| **`ToolCallLog` model** | Write-only. If audit logging is needed in v3, add a query consumer and UI first. |
| **`Conversation.aiModel`** | Never read at runtime — registry overrides it. |
| **`Conversation.customFields`** | Legacy duplicate of `customData`. |
| **`Conversation.collectedFields`** | Third overlapping JSON slot. Consolidate into `customData` in v3. |
| **`/api/meta/leads`** | 501 stub, no design behind it. |
| **`@nangohq/node` dependency** | Single optional route. Drop unless Nango is a defined product feature. |
| **`vitest` + test config** | No tests exist. Start v3 with a proper test strategy from day one rather than carrying over a broken zero-coverage setup. |

---

## Appendix A — File Tree Snapshot

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── admin-bot/
│   │   ├── boards/
│   │   │   └── [id]/  (page, settings, brain, flow, assets)
│   │   ├── builder/          ← dead (no persistence)
│   │   ├── crm/              ← duplicate of board pipeline
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── team/
│   │   ├── telegram/         ← empty scaffold (no page.tsx)
│   │   └── whatsapp/         ← deprecated, feature-flagged
│   ├── api/
│   │   ├── admin/            (reports, scan, platform-keys)
│   │   ├── ai/               (chat ✅, generate-flow ⚠️, generate-landing ⚠️)
│   │   ├── auth/             (nextauth, signup)
│   │   ├── boards/[id]/      (states, pipeline, leads, brain/*, assets, fields, custom-fields, channels, ai-config)
│   │   ├── conversations/[id]/ (messages, state, fields, ai, freeze)
│   │   ├── crm/pipeline/
│   │   ├── cron/process-jobs/  ✅
│   │   ├── dashboard/stats/
│   │   ├── debug/
│   │   ├── health/
│   │   ├── integrations/     (nango)
│   │   ├── leads/[leadId]/   (telegram-invite)
│   │   ├── meta/leads/       ❌ 501 stub
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── team/             (invite, members/[id])
│   │   ├── telegram/         (connect, disconnect, status, webhook — legacy global)
│   │   ├── telegram/webhook/[boardId]/  ✅ canonical
│   │   ├── user/
│   │   ├── webhook/          (telegram ⚠️ legacy, whatsapp ⚠️ legacy)
│   │   └── whatsapp/         (send, ai-send, connect ⚠️, account 410, disconnect 410, webhook/[boardId])
│   └── (public pages: /, /login, /signup, /agb, etc.)
├── components/
│   ├── boards/               (LeadDrawer, LeadCard, PipelineBoard, LeadImportModal, etc.)
│   ├── builder/              ← dead (visual only)
│   ├── crm/                  ← legacy
│   ├── flow-builder/         (FlowBuilder, StateForm, StateCard, PromptGenerator)
│   ├── layout/               (TopNavigation, Footer, UserMenu)
│   ├── leads/                (TelegramInviteUI)
│   └── ui/                   (shadcn primitives)
└── lib/
    ├── ai/                   (registry ✅, tool-engine ✅, providers/ ✅, groq-client ⚠️, engine ❌)
    ├── crypto/               (secrets)
    ├── jobs/                 (enqueue, runner ✅)
    ├── messaging/            (dispatcher ✅, telegram-invite)
    ├── state-machine/        (executor ✅)
    ├── tools/                (registry, index, executor, definitions/)
    ├── types/
    └── utils/
```

---

## Appendix B — Open Questions for the v3 Architect

1. **Is "Lead" distinct from "Conversation" in the product concept?** If a customer texts on WhatsApp, changes their phone number, and comes back on Telegram — is that one Lead with two Conversations, or two separate Leads? The current model cannot represent this.

2. **What is the intended role of BrainLab?** The Documents/Rules/FAQs UI exists but is never fed into inference. Is this a planned RAG feature? If yes, v3 needs a retrieval layer (embedding search or simple string injection). If it's being replaced by the `BoardBrain` system prompt, the UI and models can be dropped.

3. **Which AI provider is the primary product offering?** The codebase supports Groq/OpenRouter/OpenAI/DeepSeek/Anthropic. Is the intent that customers bring their own keys, or that the product provides a metered service with `PlatformAPIKey` keys?

4. **What happens to boards still registered on legacy webhook URLs?** Before deleting `agent.ts` and the global webhooks, existing boards in production need to be migrated. Is there a migration plan or a redirect/proxy strategy?

5. **Is the Builder feature (`/builder`) intended to ship?** It is 1,078 lines of UI with zero backend. If it is a planned product feature, it needs an API. If it was exploratory, it should be deleted from v3's scope.

6. **Is Nango a core integration strategy?** `@nangohq/node` is a significant third-party dependency. If the product will have deep third-party integrations (Google Calendar, CRMs), Nango makes sense. If not, it adds weight for a single optional route.

7. **Multi-board Telegram setup**: The current model allows one Telegram bot per board. Is that the intended UX, or should there be a company-level bot that routes to boards based on message content or user identity?

8. **Rate limiting strategy**: The in-memory rate limiter is not suitable for a public SaaS. What is the acceptable rate limiting solution? Vercel Edge, Redis, or a third-party service?

9. **Test strategy**: Zero test files exist. What level of test coverage is required before v3 ships? The architecture (job queue + executor + registry) is highly testable in isolation — but only if this is decided upfront.

10. **`AdminNotification` vs `AdminReport`**: Both exist, both serve "something needs human attention" use cases. v3 should collapse these into one concept. Which semantics should win?
