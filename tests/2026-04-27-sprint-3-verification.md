# TEST — Sprint 3 Final Hardening — Verifikation

**Datum:** 2026-04-27
**Server:** http://localhost:3001 (Next.js 14 dev)
**Basis:** audits/2026-04-27-sprint-3-final-hardening-audit.md

---

## Vorbedingung

**Seed-Script:** `scripts/seed-test-users.ts` vorhanden. Idempotent ausgefuehrt — alle Test-Fixtures in DB bestaetigt:
- User A: `test-a@conversio.test` / `test-user-a-0000000000000`
- User B: `test-b@conversio.test` / `test-user-b-0000000000000`
- Board A: `test-board-a-000000000000` (nur User A Mitglied)
- Board B: `test-board-b-000000000000` (nur User B Mitglied)

**Dev-Server:** Port 3001. Session-Cookies fuer User A (`/tmp/cookies-a.txt`) und User B (`/tmp/cookies-b.txt`) erfolgreich gesetzt.

---

## TEST 1 — R3 Login Brute-Force Rate-Limit

**Beschreibung:** 5 Fehlversuche akkumulieren den `login:test-a@conversio.test`-Counter auf 5. Der 6. Versuch mit dem **korrekten** Passwort wird durch den Rate-Limiter blockiert — kein Session-Cookie trotz richtigem Passwort.

**Designentscheidung:** NextAuth gibt bei Rate-Limit-Block denselben Redirect wie bei falschem Passwort (`?error=CredentialsSignin`). Beide `authorize()`-Pfade geben `null` zurueck. Sinnvoller Test: nach 5 Fehlversuchen mit korrektem Passwort einloggen — wenn geblockt, kein Session-Cookie.

**Befehl (vereinfacht):**
```bash
# 5 Fehlversuche
for i in 1..5: POST /api/auth/callback/credentials email=test-a password=FALSCH

# 6. Versuch mit korrektem Passwort
POST /api/auth/callback/credentials email=test-a password=TestPassword1
```

**Erwartet:** Kein `authjs.session-token`-Cookie nach dem 6. Versuch.

**Tatsaechlich:**
- Fehlversuche 1-5: `Location: .../login?error=CredentialsSignin` — kein Session-Cookie (erwartet)
- Versuch 6 (korrekt): `Location: .../login?error=CredentialsSignin` — kein Session-Cookie
- Log: `RATE LIMIT AKTIV: korrektes Passwort wurde nach 5 Fehlversuchen geblockt`

**Status: PASS**

Hinweis: Rate-Limiter-Key ist `login:<email>` — server-seitig in-memory, korrekt akkumuliert ueber separate Cookie-Jars hinweg.

---

## TEST 2 — Reports POST Cross-Tenant

**Beschreibung:** User B versucht einen Report fuer User A's Board (`test-board-a-000000000000`) zu erstellen. User B ist kein Mitglied von Board A.

**Befehl:**
```bash
curl -s -b /tmp/cookies-b.txt \
  -X POST http://localhost:3001/api/reports \
  -H "Content-Type: application/json" \
  -d '{"boardId":"test-board-a-000000000000","type":"INFO","message":"cross-tenant test"}'
```

**Erwartet:** HTTP 404 `{"error":"Nicht gefunden"}`

**Tatsaechlich:** HTTP 404 `{"error":"Nicht gefunden"}`

**Status: PASS**

---

## TEST 3 — Reports POST Happy Path

**Beschreibung:** User A erstellt einen Report fuer das eigene Board (`test-board-a-000000000000`). User A ist Mitglied (ADMIN).

**Befehl:**
```bash
curl -s -b /tmp/cookies-a.txt \
  -X POST http://localhost:3001/api/reports \
  -H "Content-Type: application/json" \
  -d '{"boardId":"test-board-a-000000000000","type":"INFO","message":"happy path test"}'
```

**Erwartet:** HTTP 201 mit Report-Objekt

**Tatsaechlich:** HTTP 201
```json
{
  "report": {
    "id": "cmogoudx80001br807te7qpjq",
    "boardId": "test-board-a-000000000000",
    "type": "INFO",
    "message": "happy path test",
    "status": "OPEN",
    "createdAt": "2026-04-27T04:19:33.500Z"
  }
}
```

**Status: PASS**

---

## TEST 4 — meta/leads Disable-Status

**Beschreibung:** Route gibt 501 zurueck statt die kaputte Implementierung auszufuehren.

**Befehl:**
```bash
curl -s -b /tmp/cookies-a.txt http://localhost:3001/api/meta/leads
```

**Erwartet:** HTTP 501 `{"error":"Nicht implementiert"}`

**Tatsaechlich:** HTTP 501 `{"error":"Nicht implementiert"}`

**Status: PASS**

---

## Gesamt-Ergebnis

| Test | Beschreibung | Status |
|---|---|---|
| T1 | R3 Brute-Force Rate-Limit (5+1 Versuche) | PASS |
| T2 | Reports POST Cross-Tenant (User B → Board A) | PASS |
| T3 | Reports POST Happy Path (User A → Board A) | PASS |
| T4 | meta/leads gibt 501 | PASS |

**4/4 Tests: PASS — kein Failure, kein Regression**

---

## Ready for DOCUMENT?

**JA.**

Alle Sprint-3-Fixes greifen gegen reale Angriffe. Happy Path unveraendert. Sprint 3 kann als abgeschlossen dokumentiert werden.
