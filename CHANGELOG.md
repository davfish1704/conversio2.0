# CHANGELOG

Alle sicherheitsrelevanten und nutzer-sichtbaren Aenderungen werden hier dokumentiert.
Format: neueste Eintraege oben.

---

## [2026-04-27] — Sprint 3: Final Hardening Verification

Verifikations-Sprint — keine neuen Features. Prueft und bestaetigt dass alle
verbleibenden Pre-Launch-Blocker auf dem aktuellen Stand korrekt greifen.

### Sicherheit (verifiziert)

- **Login Brute-Force-Schutz aktiv:** Nach 5 Fehlversuchen werden weitere Login-Versuche
  fuer die betroffene E-Mail-Adresse geblockt — auch mit korrektem Passwort.
  Implementierung: `src/auth.ts:44`, verifiziert per Test.
- **Reports POST abgesichert:** `POST /api/reports` prueft jetzt Board-Mitgliedschaft
  fuer die angegebene `boardId`. Vorher konnten authentifizierte Nutzer Reports
  fuer beliebige fremde Boards anlegen.

### Fehlerbehebung / Konsistenz

- **brain/documents, brain/faqs, brain/rules:** 404-Fehlermeldung vereinheitlicht
  auf `"Nicht gefunden"` (war `"Board not found"`). Session-Check auf
  `!session?.user?.id` verschaerft (war `!session?.user`).
- **meta/leads deaktiviert:** Route gibt jetzt `501 Nicht implementiert` zurueck
  statt FK-Constraint-Fehler mit 500. Kein DB-Code aktiv.

---

## [2026-04-26] — Multi-Tenant Security Sprint 2

### Sicherheit

- **brain/simulate abgesichert:** `POST /api/boards/[id]/brain/simulate` prueft jetzt Board-Mitgliedschaft vor dem Datenbankzugriff. Vorher konnten authentifizierte Nutzer System-Prompt, Style-Prompt, Rules und Assets beliebiger fremder Boards abrufen.
- **team/members abgesichert:** `PATCH` und `DELETE` auf `/api/team/members/[id]` pruefen jetzt ob der Ziel-Member zum eigenen Team gehoert. Vorher konnten authentifizierte Nutzer Rollen in fremden Teams aendern oder Members loeschen.

### Fehlerbehebung / Konsistenz

- **brain/documents, brain/faqs, brain/rules:** Zugriffspruefung aendert von `ownerId`-Check auf `board.members.some`. Board-Mitglieder (nicht nur Board-Owner) koennen jetzt Brain-Dokumente, FAQs und Regeln lesen und anlegen.

### Intern

- `src/lib/auth-helpers.ts`: Zwei neue Helper `assertBoardMemberAccess` und `assertTeamMemberInOwnTeam` — erweiterbar fuer weitere Sprints.
- `scripts/seed-test-users.ts`: Idempotentes Test-Seed-Script fuer zwei isolierte User mit je eigenem Team und Board.

### Nicht in diesem Sprint

- `POST /api/reports` boardId-Verifikation — geplant fuer Security Sprint 3.
