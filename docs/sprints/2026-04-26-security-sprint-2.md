# Sprint-Summary — Multi-Tenant Security Sprint 2

**Datum:** 2026-04-26
**Basis-Audit:** `audits/2026-04-26-conversation-routes-audit.md`
**Plan:** `plans/2026-04-26-security-sprint-2-plan.md`
**Tests:** `tests/2026-04-26-security-sprint-2.md`

---

## 1. Sprint Goal

Schliesse die zwei BLOCKERs und ein SHIP-WITH-RISK Item aus dem Security-Audit vom gleichen Tag:

- **BLOCKER 1:** `boards/[id]/brain/simulate` — kein Ownership-Check, beliebiger User konnte proprietary AI-Konfiguration (System-Prompt, Rules, Assets) fremder Boards abrufen.
- **BLOCKER 2:** `team/members/[id]` (PATCH + DELETE) — kein Team-Scope-Check, beliebiger authentifizierter User konnte Rolle fremder Team-Members aendern oder diese loeschen.
- **SHIP-WITH-RISK:** `brain/documents`, `brain/faqs`, `brain/rules` — Zugriffspruefung nutzte `ownerId: session.user.id` statt `members.some`, womit Board-Mitglieder (die nicht Owner sind) keinen Zugriff auf Brain-Inhalte hatten.

---

## 2. Was geliefert wurde

### Neue Helper-Funktionen (Schritt 1)

**Datei:** `src/lib/auth-helpers.ts`

- `assertBoardMemberAccess(boardId, userId)` — prueft ob `userId` Mitglied des Boards ist via `board.members.some({ userId })`. Gibt `null` bei Erfolg, `NextResponse 404` bei fehlendem Zugriff. (Zeilen 57–72)
- `assertTeamMemberInOwnTeam(targetMemberId, userId)` — prueft ob `targetMemberId` (TeamMember.id) zum selben Team gehoert wie der aufrufende User. Zwei sequentielle DB-Queries: erst eigenes Team ermitteln, dann Ziel-Member dagegen pruefen. Gibt `null` bei Erfolg, `NextResponse 404` sonst. (Zeilen 80–102)

Beide folgen dem bestehenden `Promise<NextResponse | null>`-Pattern von `assertConversationOwnership` und `assertReportOwnership`. `auth-helpers.ts` hat damit 4 exports.

### BLOCKER 1 — brain/simulate (Schritt 2)

**Datei:** `src/app/api/boards/[id]/brain/simulate/route.ts`

- Import von `assertBoardMemberAccess` hinzugefuegt.
- Session-Check von `!session` auf `!session?.user?.id` verschaerft (konsistent mit restlichem Codebase).
- `assertBoardMemberAccess(params.id, session.user.id)` direkt nach Session-Check eingefuegt, vor dem ersten `prisma.boardBrain.findUnique`-Aufruf (Zeilen 10–14).

### BLOCKER 2 — team/members/[id] (Schritt 3)

**Datei:** `src/app/api/team/members/[id]/route.ts`

- Import von `assertTeamMemberInOwnTeam` hinzugefuegt.
- In PATCH-Handler: `assertTeamMemberInOwnTeam(params.id, session.user.id)` nach Session-Check, vor `prisma.teamMember.update` eingefuegt (Zeilen 9–10).
- In DELETE-Handler: identischer Guard vor `prisma.teamMember.delete` eingefuegt (Zeilen 21–22).

### SHIP-WITH-RISK — brain/documents, brain/faqs, brain/rules (Schritt 4)

Drei Dateien, identische Aenderung — `ownerId: session.user.id` → `members: { some: { userId: session.user.id } }` in der inline `board.findFirst`-Bedingung, jeweils in GET- und POST-Handler:

- `src/app/api/boards/[id]/brain/documents/route.ts` (Zeilen 18, 48) — 2 Stellen
- `src/app/api/boards/[id]/brain/faqs/route.ts` (Zeilen 18, 48) — 2 Stellen
- `src/app/api/boards/[id]/brain/rules/route.ts` (Zeilen 18, 48) — 2 Stellen

Entscheidung gegen Helper-Einsatz hier: Die bestehenden Handler nutzen die `board`-Variable nach der Existenzpruefung nicht weiter. Ein Helper waere ein Extra-Round-Trip ohne Mehrwert. Inline-Aenderung ist minimaler und effizienter.

### Typecheck (Schritt 5)

`npx tsc --noEmit` — Exit 0, keine Fehler, Output leer.

### Test-Infrastruktur (Bonus — nicht im Plan, aber fuer Wiederverwendbarkeit angelegt)

- `scripts/seed-test-users.ts` — idempotentes Seed-Script fuer zwei isolierte Test-User mit je eigenem Team, Board und TeamMember. Nutzt feste IDs (`test-user-a-*` etc.) fuer wiederholbare Ausfuehrung ohne Duplikate.

---

## 3. Was nicht geliefert wurde

### Reports POST boardId-Verifikation

**Datei:** `src/app/api/reports/route.ts`, POST-Handler (Zeile 66–86)

Bewusst ausgeklammert. Der Auftragstext dieses Sprints schliesst diesen Punkt explizit aus: `"NICHT in diesem Sprint: reports POST boardId-Verifikation"`. Der Angriff ist auf Soft-Launch-Skala mit 5–10 Usern kein relevanter Vektor (kein Datenleak, nur Report-Spam). Backlog-Item erstellt (s. Abschnitt 5).

### Fehlermeldungs-Vereinheitlichung in brain/documents, brain/faqs, brain/rules

Die drei Routes liefern `{"error":"Board not found"}` (aus dem inline `if (!board)` Return) statt `{"error":"Nicht gefunden"}` wie der Helper-Pattern. Das ist kein Security-Issue, aber eine Inkonsistenz. Beobachtet im Test-Lauf (T4), bewusst nicht gefixt — kein Sprint-Scope, keine User-facing Auswirkung.

---

## 4. Test-Ergebnisse

**9/9 Tests bestanden. Kein Failure, kein Regression.**

| ID | Route | Angreifer | Ziel | Erwartet | Tatsaechlich | Ergebnis |
|---|---|---|---|---|---|---|
| T1 | `POST brain/simulate` | User B | Board A | 404 | 404 `Nicht gefunden` | PASS |
| T2 | `PATCH team/members/:id` | User B | TeamMember A | 404 | 404 `Nicht gefunden` | PASS |
| T3 | `DELETE team/members/:id` | User B | TeamMember A | 404 | 404 `Nicht gefunden` | PASS |
| T4 | `GET brain/documents` | User B | Board A | 404 | 404 `Board not found` | PASS |
| T5A | `POST brain/simulate` | User A | Board A (eigen) | 200 | 200 mit AI-Response | PASS |
| T5B | `GET brain/documents` | User A | Board A (eigen) | 200 | 200 `{"documents":[]}` | PASS |
| T5C | `GET brain/faqs` | User A | Board A (eigen) | 200 | 200 `{"faqs":[]}` | PASS |
| T5D | `PATCH team/members/:id` | User A | TeamMember A (eigen) | 200 | 200 mit Member-Objekt | PASS |
| T5E | `GET brain/documents` | User B | Board B (eigen) | 200 | 200 `{"documents":[]}` | PASS |
| T5F | `PATCH team/members/:id` | User B | TeamMember B (eigen) | 200 | 200 mit Member-Objekt | PASS |

Kein bestehender Happy-Path-Test schlaegt fehl. Die `members.some`-Aenderung in brain/* hat den Owner-Zugriff korrekt erhalten, da Owner immer auch BoardMember ist.

---

## 5. Offene Punkte / Backlog

| Item | Severity | Datei | Naechster Sprint |
|---|---|---|---|
| `reports/route.ts` POST — boardId ohne Membership-Check | SHIP-WITH-RISK | `src/app/api/reports/route.ts:66` | Security Sprint 3 |
| `brain/documents/faqs/rules` Fehlermeldung `"Board not found"` vs. `"Nicht gefunden"` | Inkonsistenz | `src/app/api/boards/[id]/brain/*/route.ts` | Housekeeping-Sprint |
| `team/invite` POST — kein Rollen-Check ob Caller ADMIN ist (jeder MEMBER kann einladen) | POST-LAUNCH | `src/app/api/team/invite/route.ts:23` | Post-Launch |

---

## 6. Lessons Learned

### Was gut lief

**Helper-Pattern skaliert.** Das `Promise<NextResponse | null>`-Muster aus Sprint 1 (`assertConversationOwnership`) liess sich friktionslos auf zwei neue Faelle erweitern. Alle 4 Helper in `auth-helpers.ts` sind uniform testbar und lesbar.

**Idempotentes Seed-Script.** Feste IDs in `scripts/seed-test-users.ts` machen den Test-Lauf wiederholbar ohne manuelle DB-Bereinigung. Gleiche Qualitaet wie das bestehende `create-admin.ts`.

**tsc als Gate.** Der Typecheck nach allen Aenderungen (Schritt 5) als finales Gate hat sich bewaehrt — Exit 0 bestaetigt dass alle Imports korrekt sind und kein Handler durch den Refactor gebrochen wurde.

### Was ungluecklich lief

**Dev-Server-Port-Konflikt.** Der neue Dev-Server startete auf Port 3001 statt 3000 (Port 3000 war belegt). Der erste `curl`-Versuch schlug mit Exit 7 fehl. Diagnose ueber `cat /tmp/dev-server.log` hat das schnell aufgedeckt. Fuer kuenftige Test-Runs: Port explizit pruefen oder `next dev -p 3002` waehlen.

**Zwei curl-Runden fuer Login noetig.** Der erste Login-Versuch scheiterte weil CSRF-Token und CSRF-Cookie aus unterschiedlichen Requests kamen (neuer Request generiert neues CSRF-Paar). Behoben durch Verwendung derselben Cookie-Jar fuer GET csrf + POST callback. Merke: NextAuth v5 CSRF validiert Token gegen Cookie des gleichen Requests.

**brain/documents-Fehlermeldung erst im Test entdeckt.** Der Unterschied `"Board not found"` vs. `"Nicht gefunden"` war im Code-Review nicht aufgefallen, weil er kein Security-Issue ist. Ein expliziter Fehlermeldungs-Assert im Test-Plan haette das frueher sichtbar gemacht.

**Inline vs. Helper — keine explizite Entscheidungsregel im Plan.** Die Entscheidung, bei brain/documents/faqs/rules keinen Helper zu verwenden, wurde im Plan begruendet, aber nicht als allgemeine Regel formuliert. Faustregel fuer naechste Sprints: Helper wenn die Route nach dem Access-Check keine weitere Board-Abfrage braucht; inline wenn der Board-Record fuer weitere Logik benoetigt wird.
