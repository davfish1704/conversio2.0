# PLAN — Multi-Tenant Security Fix-Sprint 2

**Datum:** 2026-04-26
**Basis:** audits/2026-04-26-conversation-routes-audit.md
**Status:** BEREIT ZUR IMPLEMENTIERUNG

---

## 1. Scope

**IN:**
- BLOCKER: `boards/[id]/brain/simulate` — Ownership-Check fehlt vollstaendig
- BLOCKER: `team/members/[id]` PATCH + DELETE — kein Team-Scope-Check
- SHIP-WITH-RISK: `brain/documents`, `brain/faqs`, `brain/rules` — `ownerId` → `members.some`

**EXPLIZIT RAUS:**
- `reports/route.ts` POST boardId-Verifikation (separater Sprint lt. Aufgabenstellung)
- Keine neuen Features, kein Refactoring ausserhalb der betroffenen Files
- Keine DB-Schema-Aenderungen, kein Prisma Migrate

---

## 2. Aenderungs-Schritte

### Schritt 1 — `src/lib/auth-helpers.ts` erweitern (S)

**Files:** `src/lib/auth-helpers.ts`

Zwei neue Helper-Funktionen ans Ende der Datei anfuegen, analog zu den bestehenden `assertConversationOwnership` / `assertReportOwnership`:

**`assertBoardMemberAccess(boardId, userId)`**
Prueft ob `userId` Mitglied des Boards ist (via `board.members.some`).
Gibt `null` bei Erfolg, `NextResponse 404` wenn kein Zugriff.

```typescript
export async function assertBoardMemberAccess(
  boardId: string,
  userId: string
): Promise<NextResponse | null> {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      members: { some: { userId } },
    },
    select: { id: true },
  })
  if (!board) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return null
}
```

**`assertTeamMemberInOwnTeam(targetMemberId, userId)`**
Prueft ob `targetMemberId` (eine `TeamMember.id`) zum selben Team gehoert wie der aufrufende User.
Zwei DB-Queries: erst eigenes Team ermitteln, dann Ziel-Member gegen dieses Team pruefen.

```typescript
export async function assertTeamMemberInOwnTeam(
  targetMemberId: string,
  userId: string
): Promise<NextResponse | null> {
  const myMembership = await prisma.teamMember.findFirst({
    where: { userId },
    select: { teamId: true },
  })
  if (!myMembership) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  const targetMember = await prisma.teamMember.findFirst({
    where: { id: targetMemberId, teamId: myMembership.teamId },
    select: { id: true },
  })
  if (!targetMember) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }
  return null
}
```

**Stop-Punkt:** Datei muss 4 exports haben (2 bestehende + 2 neue). Kein tsc-Fehler in auth-helpers.ts.

---

### Schritt 2 — `brain/simulate` absichern (S)

**File:** `src/app/api/boards/[id]/brain/simulate/route.ts`

`assertBoardMemberAccess` importieren und direkt nach dem Session-Check einfuegen, vor dem ersten DB-Zugriff auf `boardBrain` / `boardAsset`.

Aktueller Zustand (Zeile 10-15):
```typescript
if (!session) return new NextResponse("Unauthorized", { status: 401 })

const body = await req.json()
const brain = await prisma.boardBrain.findUnique({ where: { boardId: params.id } })
```

Zielzustand:
```typescript
if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 })

const denied = await assertBoardMemberAccess(params.id, session.user.id)
if (denied) return denied

const body = await req.json()
const brain = await prisma.boardBrain.findUnique({ where: { boardId: params.id } })
```

Hinweis: Gleichzeitig `!session` → `!session?.user?.id` schaerfen (konsistent mit Rest des Codebase).

**Stop-Punkt:** Route gibt 404 fuer fremde boardId. Route gibt 200 fuer eigene boardId.

---

### Schritt 3 — `team/members/[id]` absichern (S)

**File:** `src/app/api/team/members/[id]/route.ts`

`assertTeamMemberInOwnTeam` importieren. In **beiden** Handlern (PATCH + DELETE) nach dem Session-Check einfuegen, vor dem `prisma.teamMember.update` / `.delete`.

Aktueller PATCH (Zeile 5-17):
```typescript
const session = await auth()
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

const body = await req.json()
const { role } = body

const member = await prisma.teamMember.update({ where: { id: params.id }, data: { role } })
```

Zielzustand PATCH:
```typescript
const session = await auth()
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

const denied = await assertTeamMemberInOwnTeam(params.id, session.user.id)
if (denied) return denied

const body = await req.json()
const { role } = body

const member = await prisma.teamMember.update({ where: { id: params.id }, data: { role } })
```

Analoges Muster fuer DELETE.

**Stop-Punkt:** PATCH / DELETE auf fremde member-id gibt 404. PATCH / DELETE auf eigene member-id funktioniert weiterhin.

---

### Schritt 4 — `brain/documents`, `brain/faqs`, `brain/rules`: ownerId → members.some (M)

**Files (3x parallel, identische Aenderung):**
- `src/app/api/boards/[id]/brain/documents/route.ts`
- `src/app/api/boards/[id]/brain/faqs/route.ts`
- `src/app/api/boards/[id]/brain/rules/route.ts`

In beiden Handlern (GET + POST) jeder Datei den inline `board.findFirst`-Check anpassen.

Aktueller Zustand (in GET und POST identisch):
```typescript
const board = await prisma.board.findFirst({
  where: { id, ownerId: session.user.id },
})
```

Zielzustand:
```typescript
const board = await prisma.board.findFirst({
  where: { id, members: { some: { userId: session.user.id } } },
})
```

Kein Helper-Import noetig — die bestehende inline-Pruefung wird nur erweitert. Keine weitere Logik aendert sich.

Begruendung gegen Helper-Einsatz: Die bestehenden Handlers nutzen die `board`-Variable nicht weiter (nur zur Existenzpruefung). Dennoch ist ein Extra-Round-Trip mit Helper hier nicht noetig, da die inline-Aenderung minimaler ist.

**Stop-Punkt:** Board-Mitglieder koennen Brain-Dokumente/FAQs/Rules lesen und anlegen. Board-Owner weiterhin ebenfalls (Owner ist immer auch Member). Fremde User weiterhin 404.

---

### Schritt 5 — tsc + Build verifizieren (S)

```bash
npx tsc --noEmit > /tmp/tsc-sprint2.txt 2>&1; echo "Exit: $?"
```

Erwartet: Exit 0, leere Ausgabe. Bei Fehlern: Schritt-fuer-Schritt-Rollback (s.u.).

---

## 3. Reihenfolge-Begruendung

**Schritt 1 zuerst** — Helper muessen existieren bevor Routes sie importieren koennen. Ohne Helper in Schritt 2+3 wuerde tsc sofort scheitern.

**Schritt 2 + 3 vor Schritt 4** — Die BLOCKERs haben hoehere Prioritaet (aktiver Cross-Tenant-Datenleak vs. funktionale Einschraenkung). Ausserdem sind Schritt 2 und 3 von Schritt 1 abhaengig, Schritt 4 nicht.

**Schritt 4 am Ende** — Aenderung ist semantisch isoliert (nur `findFirst`-Where-Bedingung) und hat kein Risiko die BLOCKER-Fixes zu beeinflussen.

**Schritt 5 immer zuletzt** — Typcheck nach allen Aenderungen, nicht zwischendurch.

---

## 4. Test-Plan (lokaler Smoke-Test)

Voraussetzung: Zwei Test-User `user_A` und `user_B` in der Dev-DB, je in eigenem Team und je Owner eines eigenen Boards.

| # | Aktion | Erwartetes Ergebnis |
|---|---|---|
| T1 | `user_B` POST `/api/boards/<boardId_A>/brain/simulate` | 404 |
| T2 | `user_A` POST `/api/boards/<boardId_A>/brain/simulate` | 200 mit AI-Antwort |
| T3 | `user_B` PATCH `/api/team/members/<memberId_A>` mit `{role:"VIEWER"}` | 404 |
| T4 | `user_B` DELETE `/api/team/members/<memberId_A>` | 404 |
| T5 | `user_A` PATCH `/api/team/members/<memberId_A>` | 200 |
| T6 | `user_B` GET `/api/boards/<boardId_A>/brain/documents` (als Member) | 200 |
| T7 | `user_B` GET `/api/boards/<boardId_A>/brain/documents` (nicht Member) | 404 |
| T8 | `user_A` GET `/api/boards/<boardId_A>/brain/documents` (Owner = Member) | 200 — kein Regression |
| T9 | Bestehende Conversation-Routes aus Sprint 1 stichprobenartig | unveraendert 200/404 |

---

## 5. Rollback-Plan

Alle Aenderungen sind additive (neue Imports + neue Guard-Zeilen vor existierenden DB-Calls). Keine bestehende Logik wird entfernt oder umstrukturiert.

**Rollback pro Schritt:**

| Schritt | Rollback |
|---|---|
| Schritt 1 | Die zwei neuen Helper aus `auth-helpers.ts` entfernen |
| Schritt 2 | Import + `denied`-Block aus `brain/simulate/route.ts` entfernen, `!session?.user?.id` → `!session` rueckgaengig |
| Schritt 3 | Import + `denied`-Block aus `team/members/[id]/route.ts` entfernen (PATCH + DELETE) |
| Schritt 4 | `members: { some: { userId: session.user.id } }` → `ownerId: session.user.id` in allen 3 Files |

**Rollback-Ausloeser:** tsc-Fehler nach Schritt 5 oder Smoke-Test-Regression bei T8/T9. Nie Big-Bang-Rollback aller Schritte — immer nur den fehlerhaften Schritt isoliert zuruecksetzen und neu pruefen.
