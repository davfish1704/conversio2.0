# PLAN — Security Sprint 3: Final Hardening

**Datum:** 2026-04-27
**Basis:** audits/2026-04-26-sprint-3-final-hardening-audit.md

---

## 1. Scope

**IN:**
- Reports POST — boardId-Membership-Check via `assertBoardMemberAccess`
- brain/documents, brain/faqs, brain/rules — "Board not found" → "Nicht gefunden" (6 Stellen)
- brain/documents, brain/faqs, brain/rules — `!session?.user` → `!session?.user?.id` (6 Stellen)
- meta/leads — broken Implementation → 501 Not Implemented

**EXPLIZIT RAUS:**
- boards/* "Not found" / "Board not found" Stellen ausserhalb brain/* (separater Housekeeping-Sprint)
- R1 (Rate Limiter per-Instance) — Post-Launch Backlog
- R3, R6 — bereits erledigt, kein Handlungsbedarf

---

## 2. Aenderungs-Schritte

### Schritt 1 — Reports POST absichern (XS)

**File:** `src/app/api/reports/route.ts`

`assertBoardMemberAccess` importieren. Nach Body-Parse (aktuelle Zeile 73), vor `prisma.adminReport.create` (Zeile 75) einfuegen:

```
const denied = await assertBoardMemberAccess(boardId, session.user.id)
if (denied) return denied
```

**Stop-Punkt:** Import vorhanden, Guard zwischen Body-Parse und DB-Create. Kein tsc-Fehler.

---

### Schritt 2 — brain/* Fehlermeldung + session-Check (S)

**Files (3x parallel, identische Aenderung):**
- `src/app/api/boards/[id]/brain/documents/route.ts`
- `src/app/api/boards/[id]/brain/faqs/route.ts`
- `src/app/api/boards/[id]/brain/rules/route.ts`

Zwei Aenderungstypen pro Datei, jeweils in GET und POST:

1. `!session?.user` → `!session?.user?.id` (Zeilen 10, 41)
2. `"Board not found"` → `"Nicht gefunden"` (Zeilen 21, 52)

**Stop-Punkt:** Alle 6 "Board not found" Strings ersetzt. Alle 6 session-Checks verschaerft.

---

### Schritt 3 — meta/leads deaktivieren (XS)

**File:** `src/app/api/meta/leads/route.ts`

Gesamten try/catch-Block durch `return NextResponse.json({ error: "Nicht implementiert" }, { status: 501 })` ersetzen. Kommentar behalten der erklaert was hier irgendwann hin soll.

**Stop-Punkt:** Route gibt 501 zurueck. Kein DB-Code mehr aktiv.

---

### Schritt 4 — tsc (XS)

`npx tsc --noEmit > /tmp/tsc-sprint3.txt 2>&1; echo "Exit: $?"`

Erwartet: Exit 0.

---

## 3. Reihenfolge-Begruendung

Schritt 1 zuerst: einziges Security-Item. Schritt 2 danach: groesste Dateianzahl, kein Abhaengigkeit von Schritt 1. Schritt 3 zuletzt: keine Abhaengigkeiten, Route ist Orphan. Schritt 4 immer zuletzt.

---

## 4. Rollback

Alle Aenderungen sind entweder String-Ersetzungen (reversibel) oder additive Guards (entfernbar). Kein Schema-Change, kein Migrations-Touch.

| Schritt | Rollback |
|---|---|
| 1 | Import + denied-Block aus reports/route.ts entfernen |
| 2 | `"Nicht gefunden"` → `"Board not found"`, `!session?.user?.id` → `!session?.user` in 3 Dateien |
| 3 | try/catch-Block wiederherstellen aus git (oder aus diesem Dokument) |
