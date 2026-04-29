# TEST — Multi-Tenant Security Sprint 2

**Datum:** 2026-04-26
**Server:** http://localhost:3001 (Next.js 14 dev)
**Basis:** plans/2026-04-26-security-sprint-2-plan.md

---

## Vorbedingung

Test-User wurden via `scripts/seed-test-users.ts` in der DB angelegt (idempotent, wiederverwendbar):

| Fixture | ID | Beschreibung |
|---|---|---|
| User A | `test-user-a-0000000000000` | `test-a@conversio.test` |
| User B | `test-user-b-0000000000000` | `test-b@conversio.test` |
| Team A | `test-team-a-0000000000000` | User A ist Mitglied (ADMIN) |
| Team B | `test-team-b-0000000000000` | User B ist Mitglied (ADMIN) |
| Board A | `test-board-a-000000000000` | User A ist Member, User B nicht |
| Board B | `test-board-b-000000000000` | User B ist Member, User A nicht |
| TeamMember A | `test-member-a-00000000000` | User A in Team A |
| TeamMember B | `test-member-b-00000000000` | User B in Team B |

Beide User via `POST /api/auth/callback/credentials` eingeloggt, Session-Cookies in `/tmp/cookies-a.txt` und `/tmp/cookies-b.txt`.

---

## TEST 1 — brain/simulate Cross-Tenant-Read

**Beschreibung:** User B versucht `brain/simulate` auf User A's Board aufzurufen.

**Befehl:**
```bash
curl -s -b /tmp/cookies-b.txt \
  -X POST http://localhost:3001/api/boards/test-board-a-000000000000/brain/simulate \
  -H "Content-Type: application/json" \
  -d '{"message":"Hallo","state":"New Lead"}'
```

**Erwartet:** HTTP 404 `{"error":"Nicht gefunden"}`

**Tatsaechlich:** HTTP 404 `{"error":"Nicht gefunden"}`

**Status: PASS**

---

## TEST 2 — team/members PATCH Cross-Tenant

**Beschreibung:** User B versucht die Rolle von TeamMember A (in User A's Team) zu aendern.

**Befehl:**
```bash
curl -s -b /tmp/cookies-b.txt \
  -X PATCH http://localhost:3001/api/team/members/test-member-a-00000000000 \
  -H "Content-Type: application/json" \
  -d '{"role":"VIEWER"}'
```

**Erwartet:** HTTP 404 `{"error":"Nicht gefunden"}`

**Tatsaechlich:** HTTP 404 `{"error":"Nicht gefunden"}`

**Status: PASS**

---

## TEST 3 — team/members DELETE Cross-Tenant

**Beschreibung:** User B versucht TeamMember A (in User A's Team) zu loeschen.

**Befehl:**
```bash
curl -s -b /tmp/cookies-b.txt \
  -X DELETE http://localhost:3001/api/team/members/test-member-a-00000000000
```

**Erwartet:** HTTP 404 `{"error":"Nicht gefunden"}`

**Tatsaechlich:** HTTP 404 `{"error":"Nicht gefunden"}`

**Status: PASS**

---

## TEST 4 — brain/documents GET Cross-Tenant

**Beschreibung:** User B versucht Brain-Dokumente aus User A's Board zu lesen.

**Befehl:**
```bash
curl -s -b /tmp/cookies-b.txt \
  http://localhost:3001/api/boards/test-board-a-000000000000/brain/documents
```

**Erwartet:** HTTP 404

**Tatsaechlich:** HTTP 404 `{"error":"Board not found"}`

**Status: PASS**

Hinweis: Fehlermeldung ist "Board not found" (aus der Route) statt "Nicht gefunden" (aus Helper), da brain/documents den Check inline haelt. Inhaltlich korrekt.

---

## TEST 5 — Happy Path (kein Regression)

### 5A — User A brain/simulate auf eigenem Board

**Befehl:** `POST /api/boards/test-board-a-000000000000/brain/simulate` als User A

**Erwartet:** HTTP 200 mit AI-Response

**Tatsaechlich:** HTTP 200 — `{"response":{"text":"Welcome there!...","suggestedAction":"transition_to:Qualification","confidence":0.8,"usedAssets":[]}}`

**Status: PASS**

### 5B — User A brain/documents GET auf eigenem Board

**Erwartet:** HTTP 200 mit leerer Liste (Board frisch angelegt)

**Tatsaechlich:** HTTP 200 — `{"documents":[]}`

**Status: PASS**

### 5C — User A brain/faqs GET auf eigenem Board

**Erwartet:** HTTP 200

**Tatsaechlich:** HTTP 200 — `{"faqs":[]}`

**Status: PASS**

### 5D — User A team/members PATCH eigenen Member

**Befehl:** `PATCH /api/team/members/test-member-a-00000000000` mit `{"role":"MEMBER"}`

**Erwartet:** HTTP 200 mit aktualisiertem Member

**Tatsaechlich:** HTTP 200 — `{"id":"test-member-a-00000000000","teamId":"test-team-a-0000000000000","userId":"test-user-a-0000000000000","role":"MEMBER",...}`

**Status: PASS**

### 5E — User B brain/documents auf eigenem Board (nicht eingeschraenkt durch Sprint)

**Erwartet:** HTTP 200

**Tatsaechlich:** HTTP 200 — `{"documents":[]}`

**Status: PASS**

### 5F — User B team/members PATCH eigenen Member

**Erwartet:** HTTP 200

**Tatsaechlich:** HTTP 200 — `{"id":"test-member-b-00000000000","teamId":"test-team-b-0000000000000",...}`

**Status: PASS**

---

## Gesamt-Ergebnis

| Test | Beschreibung | Status |
|---|---|---|
| T1 | brain/simulate Cross-Tenant | PASS |
| T2 | team/members PATCH Cross-Tenant | PASS |
| T3 | team/members DELETE Cross-Tenant | PASS |
| T4 | brain/documents GET Cross-Tenant | PASS |
| T5A | Happy Path brain/simulate (User A) | PASS |
| T5B | Happy Path brain/documents (User A) | PASS |
| T5C | Happy Path brain/faqs (User A) | PASS |
| T5D | Happy Path team/members PATCH (User A) | PASS |
| T5E | Happy Path brain/documents (User B, eigenes Board) | PASS |
| T5F | Happy Path team/members PATCH (User B, eigener Member) | PASS |

**9/9 Tests: PASS — keine Failures, kein Regression**

---

## Ready for next step (DOCUMENT)?

**JA.**

Beide BLOCKERs aus dem Audit abgewehrt und verifiziert. Happy Path unveraendert. Sprint 2 kann als abgeschlossen markiert werden.

Offene Punkte fuer spaetere Sprints (nicht in diesem Scope):
- `reports/route.ts` POST boardId-Verifikation (SHIP-WITH-RISK, separater Sprint)
- brain/documents/faqs/rules Fehlermeldung vereinheitlichen zu "Nicht gefunden" (Konsistenz, kein Security-Issue)
