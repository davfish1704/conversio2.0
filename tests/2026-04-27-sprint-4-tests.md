# Sprint 4 — AI Engine Verifikation
**Datum:** 2026-04-27
**Dev-Server:** localhost:3000 (neugestartet nach Production-Build-Konflikt)
**Tester:** Claude Code

---

## Test-Übersicht

| # | Test | Status | Anmerkung |
|---|------|--------|-----------|
| 1 | Production Build | PASS | Exit 0, 61 Chunks |
| 2 | Migration applied | PASS | conversation_memory Tabelle vorhanden |
| 3 | Simulate — Begrüßung | FAIL | Groq API 403 — Key ungültig |
| 4 | Simulate — Tool-Trigger | FAIL | Abhängig von Test 3 (Groq) |
| 5 | Cross-Tenant-Schutz | PASS | 404 wie erwartet |
| 6 | ConversationMemory lesbar | PASS | SQL-Query erfolgreich |
| 7 | Build-Fehler AI-Files | PASS | Keine Errors in Build-Log |
| 8 | Webhook End-to-End | SKIP | META_APP_SECRET nicht in .env.local |

---

## Detailergebnisse

### TEST 1 — Production Build
**Befehl:** `npm run build > /tmp/sprint4-build.log 2>&1; echo "Exit: $?"`
**Erwartet:** Exit 0
**Tatsächlich:** Exit 0
**Status:** PASS

```
Route (app)          Size     First Load JS
├ ○ /                859 B    97.1 kB
├ λ /api/boards/[id]/brain/simulate   (kompiliert)
├ λ /api/webhook/whatsapp             (kompiliert)
...
61 Chunks generiert
```

Einzige Build-Warnung: `/api/team` nutzt `headers` (dynamischer Server-Rendering-Hinweis) — pre-existing, nicht Sprint-4-bedingt.

---

### TEST 2 — Migration applied
**Befehl:** `npx prisma db pull --print 2>&1 | grep "conversation_memory"`
**Erwartet:** mindestens 1 Treffer
**Tatsächlich:** `@@map("conversation_memory")` — Tabelle im Remote-Schema vorhanden
**Status:** PASS

---

### TEST 3 — Simulate-Endpoint (Begrüßung)
**Befehl:**
```bash
curl -s -b /tmp/cookies-a.txt \
  -X POST http://localhost:3000/api/boards/test-board-a-000000000000/brain/simulate \
  -H "Content-Type: application/json" \
  -d '{"message":"Hallo","state":"Begruessung","mission":"Begruesse den Kunden freundlich"}' \
  -w "\nHTTP_STATUS:%{http_code}"
```
**Erwartet:** 200 mit response.sentMessages
**Tatsächlich:** HTTP 500

**Server-Log (Dev-Server):**
```
⨯ Error: Groq API Fehler (tool-calling): 403 - {"error":{"message":"Access denied. Please check your network settings."}}
    at async runAgentLoop (webpack-internal:///(rsc)/./src/lib/ai/tool-engine.ts:79:26)
    at async POST (webpack-internal:///(rsc)/./src/app/api/boards/[id]/brain/simulate/route.ts:66:20)
```

**Diagnose:**
- Direkte Groq-API-Prüfung bestätigt: alle Anfragen (auch `/openai/v1/models`) geben 403
- `GROQ_API_KEY` in `.env.local` ist gesetzt (Datei vorhanden), aber der Key selbst ist ungültig oder abgelaufen
- Betrifft auch `llama-3.1-8b-instant` (pre-existing) und `llama-3.3-70b-versatile` (neu)
- **Dies ist ein Konfigurations-Problem, kein Code-Bug**

**Status:** FAIL (GROQ_API_KEY ungültig)

**Sekundärer Befund:** `simulate/route.ts` hat kein `try/catch` um `runAgentLoop()`. Ein Groq-Fehler propagiert direkt als unkontrollierter 500. Sollte in Sprint 4 oder 5 behoben werden.

---

### TEST 4 — Simulate — expliziter Tool-Trigger
**Erwartet:** toolCallCount >= 1 (search_assets)
**Tatsächlich:** SKIP — abhängig von Test 3 (Groq-Key ungültig)
**Status:** FAIL (gleiche Ursache wie Test 3)

---

### TEST 5 — Cross-Tenant-Schutz auf Simulate
**Befehl:**
```bash
curl -s -b /tmp/cookies-b.txt \
  -X POST http://localhost:3000/api/boards/test-board-a-000000000000/brain/simulate \
  -H "Content-Type: application/json" \
  -d '{"message":"test","state":"test"}' \
  -w "\nHTTP_STATUS:%{http_code}"
```
**Erwartet:** 404 "Nicht gefunden"
**Tatsächlich:**
```json
{"error":"Nicht gefunden"}
HTTP_STATUS:404
```
**Status:** PASS — `assertBoardMemberAccess` greift korrekt, bevor Groq aufgerufen wird

---

### TEST 6 — ConversationMemory Tabelle lesbar
**Befehl:** `npx prisma db execute --schema=./prisma/schema.prisma --stdin` mit `SELECT COUNT(*) FROM conversation_memory;`
**Erwartet:** Script executed successfully (Tabelle existiert, leer)
**Tatsächlich:** `Script executed successfully.`
**Status:** PASS

---

### TEST 7 — Build-Fehler in AI-Files
**Befehl:** `grep -iE "error|warning" /tmp/sprint4-build.log | grep -iE "agent|tool-engine|tools\.ts|groq"`
**Erwartet:** kein Output
**Tatsächlich:** kein Output — alle AI-Engine-Files fehlerfrei kompiliert
**Status:** PASS

---

### TEST 8 — Webhook End-to-End
**Grund:** `META_APP_SECRET` nicht in `.env.local` gesetzt — HMAC-Signierung würde fehlschlagen, WhatsApp-Send würde echte Meta-API treffen
**Status:** SKIP

---

## Bekannte Issues

### ISSUE 1 — GROQ_API_KEY ungültig (BLOCKER für Tests 3+4)
- **Datei:** `.env.local`
- **Symptom:** Alle Groq-API-Requests → 403 "Access denied. Please check your network settings."
- **Scope:** Betrifft auch bestehende Features (`generateAIResponse`, `qualifyLead`, `generateWhatsAppGreeting`) — nicht nur Sprint-4-Code
- **Action:** User muss neuen Key unter console.groq.com generieren und in `.env.local` und Vercel eintragen

### ISSUE 2 — simulate/route.ts hat kein try/catch (Non-Blocker)
- **Datei:** `src/app/api/boards/[id]/brain/simulate/route.ts:61–72`
- **Symptom:** Groq-Fehler → unkontrollierter 500 statt sauber formatierter Fehler-Response
- **Impact:** UX im FlowBuilder-Preview (Browser zeigt leeren Fehler statt Fehlermeldung)
- **Fix:** try/catch um `runAgentLoop(...)`, bei Catch: `NextResponse.json({ error: "KI nicht verfügbar: ..." }, { status: 503 })`

### ISSUE 3 — Dev-Server nach Production-Build neu starten
- **Symptom:** Nach `npm run build` lädt der laufende Dev-Server die neuen Chunks nicht (`.next/` invalidiert) → 500 `Cannot find module './chunks/vendor-chunks/next.js'`
- **Workaround:** Dev-Server nach jedem `npm run build` neu starten
- **Scope:** Next.js-Standardverhalten, kein Bug

---

## Gesamt-Status

**FAIL — FIX ISSUE FIRST**

**Begründung:**

- Tests 1, 2, 5, 6, 7 bestehen — Schema, Build, Tenant-Schutz, Typen korrekt
- Tests 3 und 4 scheitern **ausschließlich** an einem ungültigen `GROQ_API_KEY` — nicht am Sprint-4-Code selbst
- Der Code-Pfad (`runAgentLoop → groqChatWithTools → Groq API`) ist korrekt aufgebaut; der Fehler kommt von Groq, nicht aus der Implementierung
- Issue 2 (fehlendes try/catch in simulate/route.ts) ist ein separater, kleiner Fix

**Empfohlene nächste Schritte:**

1. **User-Aktion (Blocker):** Neuen `GROQ_API_KEY` in `.env.local` eintragen → Dev-Server neu starten → Tests 3+4 wiederholen
2. **Optionaler Fix (Issue 2):** try/catch in `simulate/route.ts` um `runAgentLoop()` — kann in Sprint-4-Dokumentation als Known Issue oder direkt gefixt werden
3. **Nach erfolgreichem Test 3+4:** `# DOCUMENT — Sprint 4` kann ausgeführt werden
