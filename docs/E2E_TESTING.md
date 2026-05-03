# E2E Testing mit Playwright

## Schnellstart

```bash
# 1. Test-User in DB anlegen (einmalig)
npm run db:seed-e2e

# 2. Tests ausführen (Dev-Server startet automatisch)
npm run test:e2e

# 3. HTML-Report öffnen
npm run test:e2e:report
```

## Test-User

| Credential | Wert |
|---|---|
| Email | `e2e@test.local` (oder `TEST_USER_EMAIL` env) |
| Passwort | `TestPass123!` (oder `TEST_USER_PASSWORD` env) |

Der Seed-Script ist idempotent — mehrfach ausführen ist sicher.

## Umgebungsvariablen

```bash
TEST_USER_EMAIL=e2e@test.local
TEST_USER_PASSWORD=TestPass123!
```

Ohne diese Variablen werden die obigen Defaults verwendet.

## Test-Suites

| Datei | Was wird getestet |
|---|---|
| `smoke.spec.ts` | Alle Seiten laden, kein 404, max 1 aktiver Nav-Tab |
| `board-crud.spec.ts` | Board erstellen, aufrufen, löschen |
| `custom-fields.spec.ts` | Text-Feld + Select-Feld anlegen, Feld löschen |
| `leads-crud.spec.ts` | Lead anlegen, Drawer öffnen, Notes editieren + persistieren |
| `pipeline.spec.ts` | Pipeline lädt, BUG-4-Regression, States als Spalten |
| `channels.spec.ts` | invite-channel API, Channel-UI im LeadDrawer |

## Debugging

### Interaktive UI (empfohlen für Debugging)
```bash
npm run test:e2e:ui
```

### Single Test debuggen
```bash
npx playwright test smoke.spec.ts --debug
```

### Trace Viewer (nach einem Fehler)
```bash
# Trace wird bei Failure automatisch gespeichert in test-results/
npx playwright show-trace test-results/<test-name>/trace.zip
```

### Nur bestimmte Spec ausführen
```bash
npx playwright test board-crud.spec.ts
```

## Failing Tests

Failing Tests sind **erwünscht** wenn ein Feature kaputt ist. Nicht reparieren durch:
- `test.skip()` ohne Kommentar
- `expect`-Bedingungen abschwächen
- `try/catch` um Assertions

Offene Bugs stehen in `OPEN_BUGS.md`.

## Cleanup

Alle Tests legen Boards mit `e2e-` Prefix an und löschen sie im `afterAll`-Hook.
Bei abgebrochenem Lauf: `cleanupAll()` in `helpers/api.ts` löscht alle `e2e-*` Boards.
