# Sprint 4 Plan — AI Agent Engine mit Tool-Calling
**Datum:** 2026-04-27
**Status:** PLAN (READ-ONLY)
**Autor:** Claude Code

---

## 1. Scope

### Drin
- Tool-Calling-Erweiterung für `groq-client.ts` (neue Funktion neben bestehender)
- 6 Tool-Definitionen + Executor-Funktionen in `src/lib/ai/tools.ts` (neue Datei)
- Decision-Loop mit Simulate-Modus in `src/lib/ai/tool-engine.ts` (neue Datei)
- `ConversationMemory` Model in `prisma/schema.prisma`
- Integration in `src/lib/agent.ts` (AI-State-Pfad umschalten)
- Integration in `src/app/api/boards/[id]/brain/simulate/route.ts` (SmartDummyAI ersetzen)

### Raus
- Audio-Transcription und Audio-Send (Sprint 5)
- Vector-Search auf BrainDocuments (Sprint 6+)
- AI-powered Flow Generation UI (`/api/ai/generate-flow` bleibt unberührt)
- Neue API-Routes
- UI-Änderungen

---

## 2. Architektur

```
WhatsApp Inbound (POST /api/webhook/whatsapp)
  │
  ├─ HMAC verify (bereits vorhanden, route.ts:51-58)
  ├─ Message speichern (route.ts:219-233)
  └─ processAgentResponse(conversationId, content)   ← agent.ts
        │
        ├─ frozen/aiEnabled guard (bereits vorhanden)
        ├─ getCurrentState()                          ← state-machine.ts (unverändert)
        │
        ├─ state.type === "MESSAGE"  → config.text senden (unverändert)
        ├─ state.type === "WAIT"     → return (unverändert)
        ├─ state.type === "CONDITION"→ checkStateTransition (unverändert)
        │
        └─ state.type === "AI"  ← NEU: runAgentLoop()
              │
              ├─ buildPromptStack()
              │     systemPrompt + STYLE + CONTEXT + RULES
              │     + State.mission + State.rules
              │     + ConversationMemory (key/value)
              │     + Message-History (last 10)
              │
              ├─ groqChatWithTools(messages, TOOL_DEFINITIONS)
              │
              ├─ finish_reason === "tool_calls" → Tool-Loop (max 5 Iter.)
              │     ├─ change_state(stateId)
              │     │     └─ transitionState()        ← state-machine.ts
              │     ├─ send_text(text)
              │     │     └─ Message.create() + sendWhatsAppMessage()
              │     ├─ send_asset(assetId)
              │     │     └─ BoardAsset.findUnique() + sendWhatsAppMessage()
              │     ├─ search_assets(query, type?)
              │     │     └─ BoardAsset.findMany({ tags: { hasSome } })
              │     ├─ store_memory(key, value)
              │     │     └─ ConversationMemory.upsert()
              │     └─ get_history(limit?)
              │           └─ Message.findMany(last N)
              │
              └─ finish_reason === "stop" → fertig
                    (send_text bereits ausgeführt, keine extra Outbound nötig)

simulate/route.ts (POST /api/boards/[id]/brain/simulate)
  └─ runAgentLoop(..., simulate: true)
        └─ Tools laufen im Dry-Run:
              send_text     → sammelt Text in Array, sendet nicht
              change_state  → simuliert Transition, persistiert nicht
              store_memory  → no-op
```

---

## 3. Änderungs-Schritte

### Schritt 1 — Schema: ConversationMemory Model
**File:** `prisma/schema.prisma`

**Was:** Neues Model `ConversationMemory` mit `(conversationId, key)` Unique-Constraint. Relation auf `Conversation` hinzufügen. Kein weiteres Model wird berührt.

```prisma
model ConversationMemory {
  id             String       @id @default(cuid())
  conversationId String
  key            String
  value          String       @db.Text
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([conversationId, key])
  @@index([conversationId])
  @@map("conversation_memory")
}
```

Auf `Conversation` kommt: `memories ConversationMemory[]`

**Stop-Punkt:** `npx prisma generate` Exit 0. Migration (`prisma migrate dev --name add_conversation_memory`) läuft der User selbst.

**Aufwand:** S

**Tests danach:**
- `npx prisma generate` → Exit 0, kein tsc-Fehler in prisma-client imports

---

### Schritt 2 — groq-client.ts: groqChatWithTools()
**File:** `src/lib/ai/groq-client.ts`

**Was:** Neue Export-Funktion `groqChatWithTools()` neben der bestehenden `groqChat()`. Nimmt zusätzlich `tools: GroqTool[]` entgegen, gibt `{ content, toolCalls, finishReason, usage }` zurück. Bestehende `groqChat()` bleibt unverändert.

```typescript
export interface GroqToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export interface GroqTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>  // JSON Schema
  }
}

export interface GroqToolResponse {
  content: string | null
  toolCalls: GroqToolCall[]
  finishReason: "stop" | "tool_calls" | "length"
  usage: GroqUsage
}

export async function groqChatWithTools(
  messages: GroqMessage[],
  tools: GroqTool[],
  model: string = "llama-3.3-70b-versatile",
  temperature: number = 0.3,
  maxTokens: number = 1000
): Promise<GroqToolResponse>
```

Body-Addition: `tools, tool_choice: "auto"` im fetch-JSON. Response: `choices[0].finish_reason` + `choices[0].message.tool_calls`.

**Stop-Punkt:** `tsc --noEmit` Exit 0.

**Aufwand:** S

**Tests danach:**
- Unit-Test (mock fetch): verify Request-Body enthält `tools` und `tool_choice: "auto"`
- verify Response-Parsing bei `finish_reason: "tool_calls"`

---

### Schritt 3 — src/lib/ai/tools.ts (neu)
**File:** `src/lib/ai/tools.ts` (neue Datei)

**Was:** Exportiert `TOOL_DEFINITIONS: GroqTool[]` (6 Einträge) und `executeTool(name, args, ctx)` Dispatcher. Jeder Executor ist eine eigenständige Funktion. `ctx` trägt `{ conversationId, boardId, waAccountId, customerPhone, simulate }`.

| Tool | Parameter (JSON Schema) | Executor |
|------|------------------------|---------|
| `change_state` | `{ stateId: string }` | `transitionState(conversationId, stateId)` aus state-machine.ts |
| `send_text` | `{ text: string }` | Message.create(OUTBOUND) + sendWhatsAppMessage() — bei simulate: nur collect |
| `send_asset` | `{ assetId: string }` | BoardAsset.findUnique → fileUrl/content → sendWhatsAppMessage() |
| `search_assets` | `{ query: string, type?: AssetType }` | BoardAsset.findMany mit tags/name ILIKE |
| `store_memory` | `{ key: string, value: string }` | ConversationMemory.upsert — bei simulate: no-op |
| `get_history` | `{ limit?: number }` | Message.findMany(last N, max 20) |

`executeTool` gibt immer `string` zurück (für das Tool-Result-Message an Groq).

**Stop-Punkt:** `tsc --noEmit` Exit 0. Keine DB-Calls in diesem Schritt testen — erst nach Schritt 4.

**Aufwand:** M

**Tests danach:**
- Unit: jeder Executor mit gemocktem Prisma
- `search_assets` mit leerem Ergebnis gibt lesbares `"Keine Assets gefunden"` zurück

---

### Schritt 4 — src/lib/ai/tool-engine.ts (neu)
**File:** `src/lib/ai/tool-engine.ts` (neue Datei)

**Was:** Exportiert `runAgentLoop(ctx, options)`. Baut Prompt-Stack aus Brain+State+Memory+History, startet Tool-Calling-Loop (max 5 Iterationen, Schutz gegen Endlosschleifen). Im Simulate-Modus: alle Side-Effects gesperrt, gesammelte Texts werden returned.

```typescript
export interface AgentLoopContext {
  conversationId: string
  boardId: string
  waAccountId: string
  customerPhone: string
  userMessage: string
  brain: BoardBrain
  state: { id: string; name: string; mission: string | null; rules: string | null; type: string }
  assets: BoardAsset[]
}

export interface AgentLoopOptions {
  simulate?: boolean       // default false
  maxIterations?: number   // default 5
}

export interface AgentLoopResult {
  sentMessages: string[]   // Texte die gesendet wurden / im Simulate gesammelt
  stateTransitions: string[] // State-IDs zu denen transitioniert wurde
  toolCallCount: number
  finishReason: string
}

export async function runAgentLoop(
  ctx: AgentLoopContext,
  options?: AgentLoopOptions
): Promise<AgentLoopResult>
```

Prompt-Stack-Aufbau (Reihenfolge):
1. `brain.systemPrompt`
2. `STYLE: brain.stylePrompt`
3. `CONTEXT/KNOWLEDGE: brain.infoPrompt`
4. `RULES: brain.rulePrompt`
5. `CURRENT STATE: state.name`
6. `MISSION: state.mission`
7. `BEHAVIOR RULES: state.rules`
8. `MEMORY:\n${memories.map(m => `${m.key}: ${m.value}`).join('\n')}`

History-Messages: letzte 10 Messages als `user`/`assistant` Rollen.

Iterations-Guard: nach 5 Durchläufen mit noch offenen Tool-Calls → Log LOOP-Status in ExecutionLog, return.

**Stop-Punkt:** `tsc --noEmit` Exit 0. Simulate-Modus Unit-Test läuft ohne DB.

**Aufwand:** L

**Tests danach:**
- Simulate-Modus: `send_text` sammelt ohne DB-Write
- Loop-Abbruch nach maxIterations
- Leere Tool-Call-Liste → direkt `finish_reason: "stop"` path

---

### Schritt 5 — agent.ts: AI-State-Pfad umschalten
**File:** `src/lib/agent.ts`

**Was:** Im bestehenden `processAgentResponse()` den AI-State-Zweig ersetzen. Bisher: `else { responseText = await generateAIResponse(...) }` → neu: `else if (currentState.type === "AI") { await runAgentLoop(...) }` mit separatem Else-Fall für unbekannte State-Types. `generateAIResponse` bleibt als Fallback für nicht-AI States. Outbound-Message-Speicherung und WA-Send entfallen im AI-Pfad (wird von `send_text`-Tool übernommen).

Konkrete Änderung in `agent.ts:72–138`:
- `type === "MESSAGE"` — unverändert (config.text direkt senden)
- `type === "WAIT"` — unverändert
- `type === "AI"` — **NEU:** `runAgentLoop(ctx)`, kein separater sendWhatsAppMessage-Call danach
- `type === "CONDITION"` — bleibt bei `generateAIResponse` + `checkStateTransition`
- Fallback (unbekannte Typen) — `generateAIResponse` wie bisher

`assertConversationOwnership` aus auth-helpers.ts ist in agent.ts nicht nötig (wird im Webhook nicht vom User aufgerufen), bleibt bei processAgentResponse wie bisher.

**Stop-Punkt:** `tsc --noEmit` Exit 0. Bestehende MESSAGE/WAIT-Flows dürfen nicht brechen.

**Aufwand:** S

**Tests danach:**
- curl: Webhook POST mit TEXT-Nachricht, Conversation hat AI-State → ExecutionLog hat Eintrag
- Conversation mit MESSAGE-State bleibt auf altem Pfad (kein runAgentLoop-Aufruf im Log)

---

### Schritt 6 — simulate/route.ts: SmartDummyAI ersetzen
**File:** `src/app/api/boards/[id]/brain/simulate/route.ts`

**Was:** `SmartDummyAI` entfernen, `runAgentLoop` importieren und mit `simulate: true` aufrufen. Request-Body bleibt kompatibel (`{ message, state, mission }`). Response-Format erweitern: `{ response: { sentMessages, stateTransitions, toolCallCount } }`.

Da `simulate/route.ts` keine Conversation-ID hat (es ist ein stateless Preview), wird ein Minimal-Kontext übergeben:
- `conversationId: "simulate"` (kein DB-Write wegen simulate=true)
- `brain` aus DB laden wie bisher
- `state` aus dem Request-Body (`state`-String → State-Objekt mit mission aus Request)
- `assets` aus DB laden wie bisher

**Stop-Punkt:** `tsc --noEmit` Exit 0. `assertBoardMemberAccess` bleibt am Anfang des Handlers (kein Security-Rückschritt).

**Aufwand:** S

**Tests danach:**
- curl POST `/api/boards/{id}/brain/simulate` mit `{ message: "Ja, Interesse", state: "Beratung", mission: "..." }`
- Response enthält `sentMessages` array (nicht leer)
- kein DB-Write in `conversation_memory` Tabelle nach dem Call

---

## 4. Reihenfolge-Begründung

Schema zuerst (Schritt 1), weil `ConversationMemory`-Prisma-Types in allen folgenden Dateien gebraucht werden (`store_memory`-Executor, tool-engine.ts Prompt-Stack). Ohne `prisma generate` kein Compile.

groq-client.ts vor tools.ts (Schritt 2 vor 3), weil tools.ts den `GroqTool`-Typ importiert.

tool-engine.ts nach tools.ts (Schritt 4 nach 3), weil engine.ts `executeTool` und `TOOL_DEFINITIONS` importiert.

agent.ts und simulate/route.ts zuletzt (Schritte 5+6), weil sie gegen die fertige Engine compilen.

---

## 5. Test-Plan Gesamt

### Unit-Tests (nach Schritt 3+4, keine DB nötig)
```bash
# Mock-Prisma + Mock-fetch
# tools.ts: search_assets, get_history, store_memory (no-op simulate)
# tool-engine.ts: simulate-Modus mit send_text, change_state
```

### Simulate-Endpunkt (nach Schritt 6)
```bash
# Dev-Server starten
DEV_PORT=$(grep -o ':[0-9]*' /tmp/dev-server.log | tail -1 | tr -d ':')

curl -s -c /tmp/cookies.txt http://localhost:${DEV_PORT}/api/auth/csrf \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])"

# Login (User A aus Seed)
CSRF=<token>
curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
  -X POST http://localhost:${DEV_PORT}/api/auth/callback/credentials \
  -d "csrfToken=${CSRF}&email=test-a@conversio.test&password=TestPasswordA123&redirect=false&callbackUrl=%2F&json=true"

# Simulate-Call
curl -s -b /tmp/cookies.txt \
  -X POST http://localhost:${DEV_PORT}/api/boards/test-board-a-000000000000/brain/simulate \
  -H "Content-Type: application/json" \
  -d '{"message":"Ja ich habe Interesse","state":"Beratung","mission":"Qualifiziere den Lead"}' \
  | python3 -m json.tool
# Erwartung: sentMessages array nicht leer, kein 500
```

### WhatsApp Webhook + Tool-Engine (nach Schritt 5)
```bash
# Conversation mit AI-State in DB voraussetzen (oder Seed erweitern)
# HMAC-signierten Webhook-POST senden
APP_SECRET=<aus .env.local>
BODY='{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"metadata":{"phone_number_id":"test-phone","display_phone_number":"test"},"messages":[{"id":"test-msg-1","from":"491234567890","timestamp":"1714000000","type":"text","text":{"body":"Ja, ich bin interessiert"}}]}}]}]}'
SIG="sha256=$(echo -n "${BODY}" | openssl dgst -sha256 -hmac "${APP_SECRET}" | awk '{print $2}')"

curl -s -X POST http://localhost:${DEV_PORT}/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: ${SIG}" \
  -d "${BODY}"
# Erwartung: {"status":"received"} + ExecutionLog-Eintrag in DB
```

### Tenant-Isolation (kein Rückschritt)
```bash
# User B versucht Simulate auf Board A → 404 (assertBoardMemberAccess)
curl -s -b /tmp/cookies-b.txt \
  -X POST http://localhost:${DEV_PORT}/api/boards/test-board-a-000000000000/brain/simulate \
  -H "Content-Type: application/json" \
  -d '{"message":"test","state":"test"}' | python3 -m json.tool
# Erwartung: 404
```

---

## 6. Rollback-Plan

| Schritt | Rollback-Aktion |
|---------|----------------|
| 1 (Schema) | `schema.prisma` revert + `prisma generate`. Tabelle bleibt leer, kein App-Impact bis Schritt 4 live. DB-Drop nur wenn migrate bereits lief. |
| 2 (groq-client) | Neue Funktion löschen. Keine bestehende Funktion verändert. |
| 3 (tools.ts) | Datei löschen. |
| 4 (tool-engine.ts) | Datei löschen. |
| 5 (agent.ts) | AI-State-Zweig zurück auf `generateAIResponse(...)`. Einziger kritischer Pfad. |
| 6 (simulate/route.ts) | Import zurück auf `SmartDummyAI`. |

Schritte 2–4 sind additive neue Dateien — kein Rollback-Risiko für bestehende Flows.
Schritt 5 ist der einzige Breaking-Change für Production-Traffic (AI-State-Conversations).
Wenn Schritt 5 gerollt wird bevor Schritt 6 live ist, sind beide unabhängig rollback-bar.

---

## Offene Fragen (kein Stopp, aber Implementierer beachten)

1. **Groq Tool-Calling Modell**: `llama-3.1-8b-instant` unterstützt laut Groq-Docs kein Tool-Calling. Default in `groqChatWithTools()` sollte `llama-3.3-70b-versatile` sein (tool-capable). `Conversation.aiModel` ignorieren für AI-States oder explizit mappen.
2. **send_asset**: `BoardAsset.fileUrl` kann null sein (TEXT_SNIPPET). Tool-Executor muss Fallback auf `content` implementieren und nur bei AUDIO_MEMO/PDF_DOC/IMAGE_ASSET die fileUrl schicken.
3. **Max-Iterations-Loop**: Bei `change_state` gefolgt von erneutem LLM-Call — neuer State hat anderen Prompt-Stack. Entscheidung: neuer State-Prompt wird NICHT nachgeladen innerhalb desselben Loops (zu komplex, Sprint 5). Loop läuft mit Initial-State-Kontext durch.

---

## Open Questions Resolved
**Datum:** 2026-04-27

---

### Frage 1: Wo werden Tool-Executors ausgeführt?

**Entscheidung: (a) inline in `tools.ts` — aber mit expliziten Funktionssignaturen.**

Begründung:

(b) Dependency-Injection via Factory (`createToolExecutor({ prisma, sendWhatsApp })`) wäre theoretisch sauberer, widerspricht aber dem durchgängigen Muster dieses Codebases: `auth-helpers.ts`, `ai-service.ts`, `state-machine.ts` importieren alle `prisma` direkt auf Modulebene — kein einziges File nutzt DI. Einen Bruch mit diesem Muster nur für Testbarkeit einzuführen schafft Inkonsistenz ohne ausreichenden Nutzen, da die Tests in diesem Projekt primär curl-basiert sind (vgl. `tests/2026-04-26-security-sprint-2.md`).

Die tatsächlich wichtige Voraussetzung für Testbarkeit ist nicht DI, sondern **Named Exports mit expliziten Parametern**:

```typescript
// tools.ts
export async function executeChangeState(
  args: { stateId: string },
  ctx: ToolContext
): Promise<string>

export async function executeSendText(
  args: { text: string },
  ctx: ToolContext
): Promise<string>
// ... etc.

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string>  // Dispatcher
```

Named Exports sind via `jest.mock("@/lib/db")` einzeln testbar. `ToolContext` ist ein plain object `{ conversationId, boardId, waAccountId, customerPhone, simulate }` — kein Framework-Objekt.

**Sicherheitshinweis für `change_state`:** Der Executor muss vor dem DB-Call validieren, dass `stateId` zum `ctx.boardId` gehört (`prisma.state.findFirst({ where: { id, boardId } })`). Ohne diese Prüfung könnte ein präparierter Prompt die AI dazu bringen, in einen State eines fremden Boards zu wechseln.

---

### Frage 2: Wie wird ConversationMemory befüllt?

**Entscheidung: (a) ausschließlich via `store_memory` Tool durch die AI.**

Begründung:

(b) Automatische Extraktion nach jedem Turn würde einen zweiten LLM-Call pro Inbound-Nachricht erfordern. Bei einem WhatsApp-Gespräch mit 20 Nachrichten = 20 zusätzliche Groq-Calls. Das verdoppelt Latenz und Kosten für ein Feature, das primär Langzeit-Persistenz über mehrere Sessions hinweg bedient — nicht kurzfristige Turn-Kontext-Übergabe (dafür dient die Message-History).

(c) Hybrid scheidet ebenfalls aus: Ein "automatischer Summary" ist de facto Option (b) mit extra Schritt.

(a) ist ausreichend weil:
- Die Message-History (letzte 10 `Message`-Records) löst bereits den Short-Term-Memory-Bedarf
- `ConversationMemory` ist für strukturierte Fakten gedacht, die die AI explizit als persistent markiert: Kundenname, Produkt-Interesse, Budget-Indikation, vereinbarte Folgetermine
- Der System-Prompt kann die AI anweisen, nach Erkennen dieser Fakten `store_memory` aufzurufen: `"Wenn du den Namen, Produktwunsch oder Budget des Kunden herausfindest, rufe store_memory auf."`
- Bleibt die Memory leer, ist das kein Bug — es bedeutet, die AI hat noch keine persistenzwürdigen Fakten identifiziert

Post-Launch-Option falls Memory zu selten befüllt wird: Einzelne `store_memory`-Pflicht-Aufrufe per System-Prompt erzwingen (kein Code-Change nötig, nur Prompt-Anpassung).

---

### Frage 3: Tool-Error-Handling bei Fehlern

**Entscheidung: (b) Tool gibt strukturierten Error-String zurück — für alle 6 Tools einheitlich. Kein Throw, kein Retry.**

Begründung:

Das Groq Tool-Calling Protokoll erwartet Tool-Results als Strings (`role: "tool", content: "..."`). Ein Executor der `"FEHLER: ..."` zurückgibt statt zu werfen, ist protokollkonform. Die AI bekommt den Fehler als Fakt und kann darauf reagieren — das ist präziser als ein abrupter Loop-Abbruch.

```typescript
// Beispiel Rückgabewerte
"OK: State gewechselt zu 'Beratung'"
"FEHLER: State 'xyz' nicht gefunden oder nicht zu diesem Board gehörig"
"OK: Nachricht gesendet"
"FEHLER: WhatsApp API nicht erreichbar (503). Nachricht nicht gesendet."
"OK: 3 Assets gefunden: [...]"
"OK: Keine Assets gefunden für Query 'PKW'"
```

Tool-spezifische Zusatzregeln:

| Tool | Fehlerfall | Zusatz-Aktion |
|------|-----------|---------------|
| `change_state` | stateId nicht im boardId | Security-Log (kein `needsAttention`). Kein State-Wechsel. |
| `send_text` | Meta API-Fehler | `ExecutionLog.create({ status: "ERROR", needsAttention: true })`. AI sieht Fehler-String und kann erklären. |
| `send_asset` | fileUrl null + kein content | Fallback: `content`-Feld senden. Nur wenn beides null: FEHLER-String. |
| `search_assets` | Keine Treffer | Kein Fehler — leeres Array als lesbarer String: `"Keine Assets gefunden"`. |
| `store_memory` | DB-Fehler | FEHLER-String, kein Loop-Abbruch. Memory-Write ist nicht kritisch. |
| `get_history` | DB-Fehler | FEHLER-String + leeres Array als Fallback. |

(c) Retry mit anderem Argument scheidet aus: Ein Retry-Mechanismus auf Engine-Ebene würde den Loop-Iterations-Counter schnell aufbrauchen und ist komplexer als nötig. Wenn die AI nach einem Fehler-Feedback von alleine ein korrektes Argument versucht, ist das bereits durch den normalen Tool-Loop abgedeckt.
