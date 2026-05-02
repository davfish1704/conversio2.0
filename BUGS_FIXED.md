# Bug-Fix Report — Post-Phase-4

## Bug 1: Enum Mismatch (POST /api/boards 500)

**Was kaputt war:** Vorherige Migrationen haben `adminStatus` als `TEXT DEFAULT 'active'` (lowercase) angelegt. Die v3_prep Migration konvertierte den Spaltentyp auf `BoardAdminStatus` enum und befüllte bestehende Zeilen mit `'ACTIVE'` (uppercase).

**Diagnose:** `migrate status` → "Database schema is up to date" (Migration korrekt angewendet). Prisma Client hat `BoardAdminStatus { ACTIVE, PAUSED, SUSPENDED }`. POST /api/boards setzt `adminStatus` nicht explizit — Prisma nutzt `@default(ACTIVE)` aus dem Schema.

**Verifikation:**
```
POST /api/boards → HTTP 201
Body: {"board":{"adminStatus":"ACTIVE","ownerStatus":"ACTIVE",...}}
```

**Ergebnis:** Bug bereits durch Migration gefixt. Kein Code-Change nötig.

---

## Bug 2: GET /crm 404

**Was kaputt war:** Die `/crm` Route wurde in Phase 1 gelöscht, aber direkte Navigation zu `/crm` (Bookmarks, alte Links) ergab 404.

**Geändert:** `src/app/(dashboard)/crm/page.tsx` erstellt — `redirect("/dashboard")`

**Verifikation:**
```
GET /crm → HTTP 200 (Redirect zu /dashboard, dann 200)
```

---

## Bug 3: Tab-Highlighting (CRM + Dashboard gleichzeitig aktiv)

**Was kaputt war:** In `TopNavigation.tsx` hatten beide Nav-Items (Dashboard und CRM) `href: "/dashboard"`. Die `isActive`-Funktion gab für `/boards/*` bei BEIDEN `true` zurück, da die Bedingung `pathname.startsWith("/boards/")` für `href === "/dashboard"` galt.

**Geändert:** `src/components/layout/TopNavigation.tsx`

```diff
- href: "/dashboard",   // CRM item
+ href: "/crm",         // CRM item — separater Sentinel

- const isActive = (href: string) => {
-   if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/boards/")
-   return pathname === href || pathname.startsWith(href + "/")
- }
+ const isActive = (href: string) => {
+   if (href === "/dashboard") return pathname === "/dashboard"
+   if (href === "/crm") return pathname.startsWith("/boards/") || pathname === "/crm"
+   return pathname === href || pathname.startsWith(href + "/")
+ }
```

**Ergebnis:**
- `/dashboard` → nur Dashboard-Tab aktiv
- `/boards/xxx` (und Sub-Routes) → nur CRM-Tab aktiv
- Mobile-Nav: CRM klick → `/crm` → redirect → `/dashboard`

---

## Bug 4: CRM Dropdown Pipeline-Button reagiert nicht

**Was kaputt war:** Das CRM-Dropdown-Kind "Pipeline" hatte `href: "/dashboard"` statt auf das Board-Pipeline zu verweisen. Klick auf "CRM > Pipeline" landete auf `/dashboard` — scheinbar ohne Reaktion wenn User schon dort war.

**Geändert:** `src/components/layout/TopNavigation.tsx`

```diff
- { label: t("nav.pipeline") || "Pipeline", href: "/dashboard" },
+ { label: t("nav.pipeline") || "Pipeline", href: getBoardSubLink("") },
```

`getBoardSubLink("")` gibt `/boards/${lastBoardId}` zurück (wenn ein Board bekannt, via `localStorage.crm_last_board_id`), sonst `/dashboard` als Fallback.

**Bonus-Fix:** `src/app/(dashboard)/boards/[id]/page.tsx`
```diff
- setUnassignedLeads(pipelineData.unassigned || [])
+ setUnassignedLeads(pipelineData.unassignedLeads || [])
```
(API gibt `unassignedLeads` zurück, nicht `unassigned` — alle nicht zugeordneten Leads wurden vorher immer leer angezeigt.)

---

## Curl-Verifikation Summary

| Test | Ergebnis |
|------|---------|
| `GET /api/boards` | 200 ✓ (`adminStatus: "ACTIVE"`) |
| `POST /api/boards {"name":"e2e-test-board"}` | 201 ✓ (`adminStatus: "ACTIVE"`) |
| `GET /crm` | 200 ✓ (Redirect zu /dashboard) |
| `GET /api/crm/pipeline?boardId=xxx` | 200 ✓ (7 States, board: "Test 2") |
| `GET /api/boards/xxx` | 200 ✓ |

## Noch offen

- "Add Lead"-Button auf der Board-Pipeline-Seite ist intentional `disabled` (`title="coming soon"`). Kein Bug, kein Fix nötig.
- Tab-Highlighting (Bug 3) kann nur visuell im Browser verifiziert werden (kein curl-Äquivalent für CSS-State).
