# Conversio Architecture Audit — 15.05.2026

## Executive Summary

- **Schema Drift: JA** — 11 separate TypeScript interface definitions for `State` across the codebase, each with different field subsets. `mission` existed in Prisma, was dropped, and the `agentGoal` replacement still hasn't propagated uniformly to all layers.
- **Dual Tool Systems: NEIN** — All 5 providers exclusively use native API-level tool calling. The XML regex patterns in `sanitizeAIOutput()` are cleanup/post-processing, not a parallel execution path.
- **Regex/Parser-based AI Output: TEILWEISE** — The main Agent Runtime uses native structured responses (`response.toolCalls`). But generation/supervisor/memory extraction paths use `parseJSON()` with regex extraction + JSON repair as a fallback.
- **Lineare Runtime ohne Event-System: JA** — The full message pipeline (webhook → job → state machine → LLM loop → persistence → dispatch) is synchronous JavaScript. Background jobs exist only for scheduling (cron, delayed escalation checks, summarization).
- **Fehlendes Debug-Panel: JA** — Admin pages exist for aggregated usage/notifications/reports. No per-conversation AgentRun viewer, no tool execution trace UI, no raw LLM output inspector.

---

## Detailed Findings

### AUDIT 1: Schema Drift

#### 1.1 State — Definitions Across All Layers

| Layer | File:Line | Fields | Missing vs Prisma |
|-------|-----------|--------|-------------------|
| **Prisma** | `schema.prisma:212-259` | 29 fields incl. `agentGoal`, `handoffMode`, `escalateOnLowConfidence`, all sub-agent config | — (canonical) |
| **API Route** | `src/app/api/boards/[id]/states/route.ts:53-60` | POST destructures 15 fields + `agentRole, agentSystemPrompt, agentGoal` | No `handoffRules`, `minAgentConfidence`, `nextStateOnFail` in early section (but create call includes them) |
| **API (Bulk)** | `states/bulk/route.ts:75-84` | `prisma.state.create` only writes 6 fields: `name, boardId, type, rules, orderIndex, config, agentGoal` | Missing: `nextStateId`, `dataToCollect`, `completionRule`, `availableTools`, `behaviorMode`, escalation fields, `handoffMode`, `handoffRules`, all sub-agent fields except `agentGoal` |
| **AI GeneratedState** | `generate-flow/route.ts:6-13` | 6 fields: `name, type, rules, orderIndex, config, agentGoal?` | Missing: all sub-agent config, escalation config, handoff config |
| **Frontend GeneratedState** | `PromptGenerator.tsx:7-14` | 6 fields: same as above | Same gaps |
| **StateCard State** | `StateCard.tsx:7-33` | 24 fields — most complete client-side definition | Has `handoffRules?: unknown` (type mismatch with Prisma `HandoffRule[]`) |
| **Flow Page State** | `flow/page.tsx:9-18` | 8 fields: `id, name, type, rules, orderIndex, nextStateId, config, agentGoal?` | Missing: `dataToCollect`, `completionRule`, `availableTools`, `behaviorMode`, escalation fields, `handoffMode`, all sub-agent config except `agentGoal` |
| **StateFormData** | `StateForm.tsx:21-47` | 24 fields — complete | `agentGoal: string` (vs Prisma `String?`) — non-nullable |
| **PromptState** | `ai/prompt/builder.ts:15-23` | 7 fields: `id, name, type, nextStateId, dataToCollect, completionRule, availableTools` | No `agentGoal`, no `agentRole`, no escalation config |
| **StateTemplate** | `seed-templates/types.ts:4-22` | 16 fields, all optional except name/type/orderIndex | Reasonable for seed data |
| **StateMemory** | `memory/schema.ts:16-23` | 6 fields — tracking state only | Not a State definition, but tracks `currentStateId/Name` |
| **StateConfig (legacy)** | `ai/prompt-builder.ts:14-18` | 3 fields | Minimal, legacy |

**Concrete Field Drifts:**

| Field | Prisma | StateCard | Flow Page | API Bulk Create | AI GeneratedState | PromptState |
|-------|--------|-----------|-----------|----------------|-------------------|-------------|
| `agentGoal` | `String?` | `string \| null?` | `string \| null?` | ✅ written | ✅ included | ❌ missing |
| `agentRole` | `String?` | `string \| null?` | ❌ missing | ❌ not written | ❌ missing | ❌ missing |
| `agentSystemPrompt` | `String? @db.Text` | `string \| null?` | ❌ missing | ❌ not written | ❌ missing | ❌ missing |
| `handoffMode` | `HandoffMode (default HYBRID)` | `string?` | ❌ missing | ❌ not written | ❌ missing | ❌ missing |
| `handoffRules` | `Json (default [])` | `unknown?` | ❌ missing | ❌ not written | ❌ missing | ❌ missing |
| `minAgentConfidence` | `Float (default 0.7)` | `number?` | ❌ missing | ❌ not written | ❌ missing | ❌ missing |
| `dataToCollect` | `Json (default [])` | `unknown?` | ❌ missing | ❌ not written | ❌ missing | ✅ included |
| `completionRule` | `String?` | `string \| null?` | ❌ missing | ❌ not written | ❌ missing | ✅ included |
| `availableTools` | `Json (default [])` | `string[]?` | ❌ missing | ❌ not written | ❌ missing | ✅ included |

#### 1.2 Lead — Definitions

| Layer | File:Line | Type Mismatches |
|-------|-----------|-----------------|
| Prisma | `schema.prisma:279-310` | `tags: String[] (default [])`, `customData: Json (default {})`, `stateHistory: Json?` |
| lib/types | `lib/types/index.ts:28-46` | `tags: string[]` ✅, `customData: Record<string, unknown>` ✅, `stateHistory?: unknown` ✅ |
| LeadCard | `LeadCard.tsx:9-30` | `tags: string[]` ✅, `customData: Record<string, unknown> \| null` (Prisma default `{}` won't be null) |

No significant drift on Lead — the Prisma model and TypeScript interfaces are well-aligned.

#### 1.3 Message — Definitions

| Layer | File:Line | Type Mismatches |
|-------|-----------|-----------------|
| Prisma | `schema.prisma:358-377` | `direction: Direction`, `messageType: MessageType`, `status: MessageStatus`, `metadata: Json?` |
| lib/types | `lib/types/index.ts:65-77` | String enums, `metadata?: Record<string, unknown> \| null` ✅ |
| LeadDrawer | `LeadDrawer.tsx:43-50` | Only 6 fields: `id, direction, content, timestamp, aiGenerated?, status` — subset is fine |

No significant drift on Message.

#### 1.4 Tool — Definitions

| Layer | File:Line | Notes |
|-------|-----------|-------|
| Tool interface | `registry.ts:18-31` | 7 fields: `name, description, parameters, isStub?, requiresApproval?, execute()` |
| AIMessage | `providers/types.ts:1-7` | `role, content, tool_calls?, tool_call_id?, name?` |
| ToolCall | `providers/types.ts:15-19` | `id, name, arguments` |
| AIResponse | `providers/types.ts:21-34` | `content, toolCalls[], finishReason, usage, model, provider, providerCost, rawResponse?` |
| ToolDefinition | `providers/types.ts:9-13` | `name, description, parameters` |

**Notable gap:** `AIProvider.chat()` interface defines `tools?: ToolDefinition[]` but the `AIProvider` class in `types.ts:36-47` accepts it optionally. No Zod validation enforces that tool definitions have valid JSON Schema.

#### 1.5 Namens-Inkonsistenzen

| Concept | Name in Layer A | Name in Layer B | Files |
|---------|----------------|----------------|-------|
| Agent goal | `agentGoal` (Prisma, API, StateCard, StateForm) | `mission` (deleted column, legacy compatibility shims) | `generate-flow/route.ts:21`, `brain/simulate/route.ts:36` (legacy compat) |
| Escalation trigger | `escalateOnOffMission` (Prisma) | `off_mission` (notification type) | `notifications.ts:3` |
| Lead custom data | `customData` (Prisma field) | In-memory accessed as `customData` but stored as `LeadMemory` entries | `sub-agent-runtime.ts` |
| Tool execution log | `ExecutionLog` (Prisma model) | `toolCallsMade` (AgentRun JSON field) | Both used, different granularity |
| State condition rules | `rules` (Prisma field) | Parsed as `ParsedCondition` in `state-machine.ts` | Different internal representation |

---

### AUDIT 2: Tool Calling Architecture

#### 2.1 Provider Support for Native Tool Calling

**Answer: ALL 5 providers use native tool calling exclusively. NO dual systems.**

| Provider | File | Native Tool Calling | API Used | Tool Param | Response Extraction |
|----------|------|:---:|----------|------------|-------------------|
| OpenAI | `providers/openai.ts:28-36` | **YES** | OpenAI SDK `chat.completions.create()` | `tools: openaiTools, tool_choice: "auto"` | `choice.message.tool_calls` → `parseToolCalls()` at line 89-100 |
| DeepSeek | `providers/deepseek.ts:28-36` | **YES** | OpenAI SDK (custom baseURL) | Identical to OpenAI | Identical |
| Groq | `providers/groq.ts:28-36` | **YES** | OpenAI SDK (custom baseURL) | Identical to OpenAI | Identical |
| OpenRouter | `providers/openrouter.ts:28-36` | **YES** | OpenAI SDK (custom baseURL) | Identical to OpenAI | Identical |
| Anthropic | `providers/anthropic.ts:29-42` | **YES** | Raw fetch to API | `body.tools` array | `content[].type === "tool_use"` → `toolUseBlocks` at lines 66-72 |

All OpenAI-compatible providers (`openai.ts`, `deepseek.ts`, `groq.ts`, `openrouter.ts`) are structurally identical — each has its own copy of `toOpenAIMessage`, `toOpenAITool`, `parseToolCalls`, and `mapFinishReason`.

#### 2.2 XML/Regex-Based Tool Call Processing

**There is NO XML-based tool call execution.** The XML regex patterns exist ONLY in `sanitizeAIOutput()` which is a **post-processing cleanup** function:

| Pattern | File:Line | Purpose |
|---------|-----------|---------|
| `<function=[^>]+>[^<]*<\/function>` | `ai/prompt/builder.ts:167` | Strip legacy `<function=name>args</function>` |
| `<function=[^>]+\/>` | `ai/prompt/builder.ts:168` | Strip self-closing `<function=name/>` |
| `<function\(\w+\)[\s\S]*?<\/function>` | `ai/prompt/builder.ts:169` | Strip `<function(name){...}</function>` (parentheses format) |
| `\{?\s*"function"\s*:\s*"[^"]+"\s*\}?` | `ai/prompt/builder.ts:170` | Strip `{"function": "name"}` patterns |
| `Here(?:'s\| is) the result...OK\|FEHLER\|ERROR: {...}` | `ai/prompt/builder.ts:171-173` | Strip tool result injection patterns |

**These are defensive sanitizers — NOT a parallel execution system.** They exist because the LLM occasionally emits XML-style function call syntax in the text `response.content` field alongside native `response.toolCalls`. The sanitizer strips this XML from the final user-facing message.

#### 2.3 Tool Calling Flow

```
sub-agent-runtime.ts:151  →  getToolDefinitions(toolNames)  →  ToolDefinition[]
sub-agent-runtime.ts:209  →  aiRegistry.execute({ tools: toolDefs })
registry.ts:218           →  provider.chat({ tools: params.tools })
provider.ts:30-36         →  OpenAI SDK: tools array + tool_choice: "auto"
provider.ts:89-100        →  parseToolCalls(choice.message.tool_calls)  →  ToolCall[]
sub-agent-runtime.ts:245  →  executeToolCalls({ toolCalls: response.toolCalls })
tools/executor.ts:27-73   →  For each: validate, execute with 10s timeout, log ExecutionLog
```

There is **no code path** where XML tool tags are parsed and executed. The `response.content` text is never searched for tool call patterns.

---

### AUDIT 3: AI Output Parsing

#### 3.1 Structured Output Extraction Points

| Location | File:Line | Method | Regex/Manual? | Native Structured Output? |
|----------|-----------|--------|:---:|:---:|
| Flow generation | `generate-flow/route.ts:87-98` | `extractJson()` → `JSON.parse()` | ✅ regex (`/[\[{][\s\S]*[\]}]/`) | ❌ no `response_format` |
| Landing page gen | `generate-landing/route.ts:91-103` | `extractJson()` → `JSON.parse()` | ✅ regex | ❌ no `response_format` |
| Memory extraction | `memory/extractor.ts:31` | `parseJSON()` via `extractStructuredJSON()` | ✅ regex + JSON repair | ❌ no `response_format` |
| Supervisor decision | `decision-engine.ts:74` | `parseJSON()` → `JSON.parse()` | ✅ regex + JSON repair | ❌ no `response_format` |
| AI chat (lead scoring) | `ai/chat/route.ts:97-101` | `JSON.parse(res.content)` | ✅ try-catch fallback | ❌ no `response_format` |
| Custom fields gen | `custom-fields/generate/route.ts:31-36` | regex strip fences → `JSON.parse()` | ✅ regex | ❌ no `response_format` |
| Tool call args parsing | all providers `openai.ts:97` | `JSON.parse(fn.arguments)` | only try-catch for malformed JSON | ✅ uses native OpenAI SDK format |

**JSON repair functions:**
- `parseJSON()` at `lib/ai/json/parser.ts:8-50`: strips markdown fences, extracts braces/brackets, wraps with try-catch
- `attemptFix()` at `lib/ai/json/parser.ts:60-74`: trailing commas, unquoted keys, single-quoted values, unclosed braces
- `extractNumber()` at `lib/ai/json/parser.ts:54-58`: regex number extraction

**Markdown fence stripping locations:**

| File | Line | Pattern Used |
|------|------|-------------|
| `lib/ai/json/parser.ts` | 10-12 | ````/```json\s*/gi````, ````/```\s*$/gi````, ````/```/gi```` |
| `generate-flow/route.ts` | 17-18 | ````/```json\s*/gi````, ````/```\s*/g```` |
| `generate-landing/route.ts` | 92 | ````/^```json\s*\|\s*```$/g```` |
| `custom-fields/generate/route.ts` | 31 | ````/^```json?\n?/````, ````/\n?```$/```` |

**Additional regex on AI/user text:**

| Location | File:Line | Regex Pattern | Purpose |
|----------|-----------|---------------|---------|
| CONDITION parsing | `state-machine.ts:137` | `/(\w+)\s*(>\|<\|=contains\|equals)\s*["']?([^"'\n]+)["']?/i` | Parse state machine condition rules |
| CONDITION parsing (executor) | `executor.ts:184-185` | Same pattern | Duplicate parse logic |

#### 3.2 Count Summary

- **Places with structured AI output extraction:** 6 distinct endpoints/helpers
- **Places with regex/manual JSON parsing:** 6 (all of the above)
- **Places using native `response_format`:** 0
- **Ratio structured : regex** = 0 : 6 — ALL structured AI output extraction uses regex/manual parsing

**Key finding: The `response_format: { type: "json_object" }` API is NOT used anywhere.** Every endpoint that expects structured JSON from the LLM relies on the model following a prompt instruction + post-hoc regex extraction/repair. This is a known reliability issue — if the model wraps JSON in markdown fences, adds explanatory text, or produces malformed JSON, the extraction layer must handle it.

---

### AUDIT 4: Runtime Flow

#### 4.1 Complete Message Processing Trace

```
Telegram/WhatsApp Webhook
  │  POST /api/{whatsapp|telegram}/webhook/[boardId]
  │  File: what|tel/webhook/[boardId]/route.ts
  │  ├─ processedWebhook.findUnique/create (idempotency check)
  │  ├─ find-or-create Lead + Conversation
  │  ├─ prisma.message.create({ direction: "INBOUND" })
  │  └─ enqueueJob("process_message", { conversationId, userMessage })
  │                                               DIRECT (linear function call)
  ▼
Job Runner (via Vercel Cron, every 1min)
  │  File: lib/jobs/runner.ts
  │  └─ acquireConversationLock(convId)     ← in-memory Map, NOT distributed
  │     └─ executeStateForConversation(convId, userMessage)
  │                                          DIRECT (linear function call)
  ▼
State Machine Executor
  │  File: lib/state-machine/executor.ts
  │  ├─ Pre-checks: frozen? aiEnabled? currentState?
  │  ├─ maybeScheduleSummarization()         ← ENQUEUES BACKGROUND JOB (fire-and-forget)
  │  └─ dispatch by type:
  │       ├─ "MESSAGE" → prisma.message.create + sendMessage()      LINEAR
  │       ├─ "CONDITION" → evaluateCondition() → transitionState()  LINEAR
  │       └─ "AI" → executeSubAgentRun()                            LINEAR
  ▼
Sub-Agent Runtime
  │  File: lib/agents/sub-agent-runtime.ts
  │  LOOP (max 5 iterations) — fully synchronous:
  │  ├─ aiRegistry.execute()          → provider.chat()
  │  ├─ executeToolCalls()            → per tool: ExecutionLog.write()
  │  └─ append to in-memory messages[]
  │  └─ (if exhausted) forced final iteration without tools
  │  ├─ sanitizeAIOutput(finalContent)
  │  ├─ handoff engine → transitionState()  → lead stage update
  │  ├─ prisma.agentRun.create()
  │  ├─ prisma.message.create({ OUTBOUND })
  │  ├─ sendAIResponse()              → Telegram/WhatsApp HTTP API
  │  └─ fire-and-forget:
  │       ├─ extractMemory()           ← LLM call (async, not awaited)
  │       └─ checkReactiveTriggers()   ← supervisor (async, not awaited)
```

#### 4.2 Linear vs Event-Based

| Step | Type | File:Line |
|------|------|-----------|
| Webhook → Job Enqueue | **Linear** (function call `enqueueJob()`) | `whatsapp/route.ts:195-200`, `telegram/route.ts:317-324` |
| Job → State Executor | **Linear** (function call `executeStateForConversation()`) | `jobs/runner.ts:119-122` |
| State Executor → Sub-Agent | **Linear** (function call `executeSubAgentRun()`) | `state-machine/executor.ts:237` |
| Sub-Agent → LLM Call | **Linear** (function call `aiRegistry.execute()`) | `sub-agent-runtime.ts:205` |
| Sub-Agent → Tool Execution | **Linear** (function call `executeToolCalls()`) | `sub-agent-runtime.ts:245` |
| Sub-Agent → Persistence | **Linear** (await `prisma.message.create()`) | `sub-agent-runtime.ts:441-450` |
| Sub-Agent → Message Dispatch | **Linear** (await `sendAIResponse()`) | `sub-agent-runtime.ts:452-454` |
| Sub-Agent → Memory Update | **Fire-and-forget** (`.then()`, no `await`) | `sub-agent-runtime.ts:465-481` |
| Sub-Agent → Supervisor Trigger | **Fire-and-forget** (`.then()`, no `await`) | `sub-agent-runtime.ts:484-496` |
| Summarization scheduling | **Background Job** (enqueued via `enqueueJob()`) | `state-machine/executor.ts:42-46` |
| Escalation check | **Background Job** (enqueued via `enqueueJob()`) | `state-machine/executor.ts:255-260` |
| Cron trigger for jobs | **Vercel Cron** (every 1min) | `api/cron/process-jobs/route.ts` |

**The entire core message processing pipeline is synchronous/linear.** Background jobs exist only for:
1. Scheduling delayed work (escalation checks after N hours, summarization after N messages/24h)
2. Processing the job queue (Vercel Cron every 1 minute runs `processNextBatch()`)

#### 4.3 Potential Race Conditions

| Risk | Mechanism | Location | Severity |
|------|-----------|----------|----------|
| Concurrent processing of same conversation | In-memory `conversationLocks` Map chains executions per conversation | `runner.ts:4-19` | **Medium** — works within single instance. Multiple Vercel instances could process concurrently. |
| Duplicate webhook processing | `processedWebhook` table with `@@unique([externalId, channel, boardId])` — `findUnique` then `create` | Both webhooks | **Low** — DB unique constraint catches duplicates |
| Job reclamation | `SELECT ... FOR UPDATE SKIP LOCKED` — row-level locking prevents multiple workers claiming same job | `runner.ts:24-37` | **None** — Postgres-level locking |
| Memory update race | `extractMemory()` runs fire-and-forget, could interleave with next conversation turn | `sub-agent-runtime.ts:465-481` | **Low** — memory read happens at start of next run, eventual consistency |
| Supervisor trigger race | `checkReactiveTriggers()` runs fire-and-forget with its own DB queries | `sub-agent-runtime.ts:484-496` | **Low** — reads current state, no side effects on conversation |

#### 4.4 Tool Execution State in Memory (Not DB)

During the LLM tool loop (iterations 1-5):
- `messages: AIMessage[]` — the complete conversation + tool results — is kept **only in memory**
- Tool results (e.g., `"OK: {\"stored\":[\"intent\"]}"`) are pushed into `messages[]` for the next LLM iteration
- If the process crashes between iterations, the tool results are lost and cannot be recovered
- Only after the loop ends is the `AgentRun.toolCallsMade` summary persisted (without arguments)

---

### AUDIT 5: Observability

#### 5.1 What Is Persisted Per Message Processing

| Table | Records Per Run | Key Fields | Written At |
|-------|----------------|------------|------------|
| `Message` (OUTBOUND) | 1 (if response generated) | `conversationId`, `direction: OUTBOUND`, `content` (sanitized), `aiGenerated: true` | `sub-agent-runtime.ts:441-450` |
| `AgentRun` | 1 | Full audit: prompt, messages, outcome, model, tokens, tool calls, errors | `sub-agent-runtime.ts:407-434` |
| `ExecutionLog` | N (per tool call) | `action` (tool name), `input` (args JSON), `output` (result JSON), `status` | `tools/executor.ts:56-68` |
| `UsageLog` | 1+ (per LLM call) | `model`, `provider`, `inputTokens`, `outputTokens`, `totalTokens`, `providerCost` | `sub-agent-runtime.ts:221-232` (+324-335) |
| `LeadMemory` | 0+ (if facts extracted) | `leadId`, `key`, `value` | `sub-agent-runtime.ts:467-471` |

#### 5.2 Raw Model Output

**Not persisted.** The `AIResponse.rawResponse` field exists in the type definition (`providers/types.ts:33`) and is populated by the Anthropic provider (`anthropic.ts:95`). However, it is never written to the database. The `AgentRun.agentResponse` stores the `sanitizeAIOutput()`-processed text only.

#### 5.3 Tool Call Logging — Two Systems, Different Granularity

| Storage | Granularity | What's Stored | What's Missing |
|---------|-------------|---------------|----------------|
| `ExecutionLog` | Per individual tool call | `action` (name), `input` (args JSON string), `output` (result JSON string), `status`, `errorMessage`, `needsAttention` | No link to parent AgentRun (no `agentRunId` FK) |
| `AgentRun.toolCallsMade` | Per agent run (aggregated) | `[{ name: string, args: {} }]` | Tool call **arguments are empty objects** (`allToolCallsMade.push({ name: ex.toolName, args: {} })` at `sub-agent-runtime.ts:254`). Cannot reconstruct what arguments were passed from AgentRun alone. |

#### 5.4 Admin / Debug UI — What Exists, What's Missing

| Feature | File | Exists? |
|---------|------|:-------:|
| Token usage dashboard (aggregated) | `admin-usage/page.tsx` | ✅ |
| Admin notifications panel | `admin-notifications/page.tsx` | ✅ |
| Bot monitoring / admin reports | `admin-bot/page.tsx` | ✅ |
| Per-conversation AgentRun viewer | — | ❌ **missing** |
| Tool execution trace UI | — | ❌ **missing** |
| Raw LLM response inspector | — | ❌ **missing** |
| State machine execution trace | — | ❌ **missing** |
| Real-time conversation inspector | — | ❌ **missing** |

#### 5.5 State Transition Tracking

| Storage | Details |
|---------|---------|
| `Lead.stateHistory` (JSON) | Array of `{ fromStateId, toStateId, reason, movedBy, timestamp }` — written on every transition |
| `Lead.currentStateId` | Current state FK |
| `Lead.stageMovedAt` | Timestamp of last stage change |
| `ExecutionLog` with `STATE_TRANSITION:*` action | Created per transition |
| `Conversation.currentStateId` | Per-conversation current state |
| LeadDrawer "State-Verlauf" UI | Shows transition history from `Lead.stateHistory` |

**Bug found:** LeadDrawer (`LeadDrawer.tsx:971`) references `entry.fromStateName` but `stage-guard.ts` only stores `fromStateId` (no name lookup at write time). `fromStateName` will be `undefined`.

---

## Was die externe Analyse RICHTIG diagnostiziert hat

1. **Schema Drift zwischen State-Definitionen** — 11 Interfaces mit unterschiedlichen Feldmengen. Die Bulk-Create-API schreibt z.B. nur 6 von 29 Feldern.
2. **parseJSON mit Regex-Extraktion + JSON-Reparatur** — Wird in 6 Endpunkten verwendet. Der `response_format` API-Mechanismus wird nicht genutzt.
3. **Kein Debug-Panel** — Es gibt kein UI um einzelne AgentRuns, Tool-Ausführungen oder Raw LLM Output zu inspizieren.
4. **ToolCall-Argumente werden nicht in AgentRun persistiert** — `args: {}` ist immer leer.

## Was die externe Analyse FALSCH oder ÜBERTRIEBEN diagnostiziert hat

1. **"Dual Tool Systems (native tool calls + XML parsing parallel)"** — **FALSCH.** Es gibt kein XML-basiertes Tool-Calling. Alle 5 Provider verwenden ausschließlich native API-level tool calling. Die XML-Regexen in `sanitizeAIOutput()` sind defensives Post-Processing für den Chat-Text, kein zweites Ausführungssystem.
2. **"Regex/Parser-basierte AI-Output Verarbeitung" als pauschale Aussage** — **ÜBERTRIEBEN.** Der Haupt-Agent-Runtime-Pfad (sub-agent-runtime.ts) verwendet native `response.toolCalls` und kein Regex-Parsing. Regex-Extraktion wird primär in den separaten "Generation"-Endpunkten (Flow-Generator, Supervisor, Memory-Extraktion) verwendet — nicht im Kern-Konversations-Loop.
3. **"Lineare Runtime" als Problem** — **KORREKT ABER KONSEQUENZ ÜBERTRIEBEN.** Die lineare Architektur ist für eine Einzel-Chat-Verarbeitung pro Conversation korrekt. Die in-memory Lock (`conversationLocks`) ist das größere praktische Problem bei Multi-Instance-Deployment (Vercel).

## Was die externe Analyse ÜBERSEHEN hat

1. **Bulk-State-Create schreibt nur 6 von 29 Feldern** — Wenn ein Flow via "Replace" neu generiert wird, gehen alle Sub-Agent-Konfigurationen verloren (`agentRole`, `agentSystemPrompt`, `handoffMode`, `handoffRules`, `escalateOnLowConfidence`, alle escalation/reply Felder).
2. **AgentRun.toolCallsMade speichert leere `args: {}`** — `sub-agent-runtime.ts:254` pusht `{ name: ex.toolName, args: {} }`. Die tatsächlichen Tool-Argumente sind nur über `ExecutionLog` rekonstruierbar, aber ExecutionLog hat keine agentRunId FK.
3. **AIResponse.rawResponse wird nie persistiert** — Das Feld existiert im Type, wird vom Anthropic-Provider befüllt, aber nie in die DB geschrieben.
4. **Leere catch-Blöcke** — `sub-agent-runtime.ts` verwendet `.catch(() => {})` für Memory-Updates, Message-Send-Failures, AgentRun-Persistierung. Fehler werden geschluckt.
5. **stateHistory in LeadDrawer zeigt `undefined`** — `LeadDrawer.tsx:971` liest `entry.fromStateName`, aber `stage-guard.ts` speichert nur `fromStateId`.
6. **Kein Fallback für nicht-native-tool-calling Modelle** — Wenn ein Modell keine native tool calling Unterstützung hat (oder der Provider sie nicht unterstützt), wird `response.toolCalls` immer leer sein, der Inhalt der `response.content` (möglicherweise XML-Funktionsaufrufe) wird nicht als Tool-Call interpretiert.
