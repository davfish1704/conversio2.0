# Sprint 5: Theme & i18n Cleanup — Audit
**Datum:** 2026-04-28
**Prüfer:** Claude Code
**Basis:** audits/2026-04-27-full-product-inventory.md

---

## Status-Übersicht

| Bereich | Status | Aufwand 100% Coverage |
|---------|--------|-----------------------|
| 1. ThemeContext Infrastruktur | VOLLSTAENDIG | — (bereits korrekt) |
| 2. LanguageContext Infrastruktur | VOLLSTAENDIG, 1 Bug | XS |
| 3. Dark Mode CSS-Variable-System | VOLLSTAENDIG | — |
| 4. Dark Mode Tailwind-Klassen Coverage | LUECKENHAFT | L |
| 5. i18n Coverage auf Settings-Page | DEFEKT | XS |
| 6. Recharts Dark Mode | KEIN SUPPORT | S |

---

## 1. ThemeContext — Infrastruktur

### Was existiert
- **`src/lib/ThemeContext.tsx`** — vollständig implementiert
  - State: `"light" | "dark"`, Default: `"light"`, System-Preference wird on-mount gelesen
  - Persistenz: `localStorage("conversio-theme")` only — kein DB-Feld
  - `document.documentElement.classList.toggle("dark", ...)` — korrekte Tailwind-class-Mode Steuerung
  - Exportiert `useTheme()` Hook
- **`src/app/layout.tsx`** — ThemeProvider wraps gesamte App
  - Inline `<script>` im `<head>` liest localStorage vor React-Hydration → kein FOUC
  - `<body className="bg-white dark:bg-black text-gray-900 dark:text-white transition-colors">` korrekt
- **`tailwind.config.js`** — `darkMode: 'class'` korrekt gesetzt
- **`src/app/globals.css`** — vollständige CSS-Variable-Sets für `:root` und `.dark`:
  - `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--border` etc.
  - Shadcn/ui Komponenten (die `bg-background`, `text-foreground` nutzen) adaptieren automatisch

### Was fehlt
- Nichts. Infrastruktur ist production-ready.

### Ergebnis
Wer `dark:` Klassen oder CSS-Vars (`bg-background`, `text-foreground`) verwendet, bekommt Dark Mode gratis. Das Problem ist, dass viele Komponenten rohe Tailwind-Farbklassen ohne `dark:` nutzen.

---

## 2. LanguageContext — Infrastruktur

### Was existiert
- **`src/lib/LanguageContext.tsx`** — vollständig implementiert
  - Sprachen: `"en" | "de"` (nur zwei)
  - Lade-Reihenfolge: 1. `/api/user` (DB), 2. localStorage Fallback
  - Persistenz: localStorage + PATCH `/api/user` mit `{ language }`
  - `t(key)` — dot-notation Lookup in `translations[language]`
  - Exportiert `LanguageContext`, `LanguageProvider`
- **`src/lib/translations.ts`** — 830 Zeilen, ~718 Leaf-Strings (EN + DE)
  - Namespaces: `nav`, `crm`, `auth`, `errors`, `settings`, `common`, `dashboard`, `boards`, `brain`, `team`, `flow`, `reports`
  - Kein externes i18n-Framework (kein next-intl, kein i18next)
- **`src/app/layout.tsx`** — LanguageProvider wraps gesamte App
- `LanguageContext` aktiv genutzt in **26 Dateien** (t()-Calls: 169 total)

### Was fehlt / Bugs

**B1 — `settings/page.tsx` nutzt lokalen State statt LanguageContext (BUG)**
```tsx
// Zeile 3: Nur useState importiert, kein LanguageContext
import { useState } from "react"

// Zeile 23: Lokaler State
const [language, setLanguage] = useState("en")

// Zeilen 34, 45: Buttons rufen nur lokalen State auf
onClick={() => setLanguage("en")}   // ← kein API-Call, kein Kontext-Update
```
Fix (minimal, 4 Zeilen):
```tsx
import { useContext } from "react"
import { LanguageContext } from "@/lib/LanguageContext"
// ...
const { language, setLanguage } = useContext(LanguageContext)
// onClick bleibt gleich — setLanguage aus Context persistiert bereits korrekt
```

**Strings in `settings/page.tsx` nicht via `t()` — aber niedrige Priorität**
Settings-Strings wie "Language", "Timezone", "Dark Mode" sind hardcoded (kein `t()`).
`translations.ts` hat alle Keys dafür (`settings.language`, `settings.timezone` etc.).
Da Settings-Page noch zur Hälfte "Coming soon" ist, ist das kein Launch-Blocker.

### Aufwand
- B1 Fix: **XS** (4 Zeilen, 1 Datei)
- Volle i18n Settings-Page: **S** (wenn Tab-Inhalte gebaut werden)

---

## 3. Dark Mode CSS-Variablen — System

### Befund: vollständig aufgebaut, aber kaum genutzt

`globals.css` definiert vollständige Shadcn-kompatible CSS-Vars für Light und Dark:

| Variable | Light | Dark |
|----------|-------|------|
| `--background` | 0% 100% (weiss) | 4.9% (fast schwarz) |
| `--foreground` | 4.9% (fast schwarz) | 98% (fast weiss) |
| `--card` | weiss | fast schwarz |
| `--border` | hell grau | dunkel grau |
| `--muted` | hell grau | dunkel blau-grau |

Shadcn/ui-Basiskomponenten (`src/components/ui/`) nutzen diese Vars (`bg-background`, `text-foreground`, `border-border`). Diese adaptieren automatisch.

**Problem:** Die meisten Feature-Komponenten (LeadDrawer, PipelineStage, StatsBar etc.) nutzen rohe Tailwind-Farbklassen (`bg-white`, `text-gray-900`) statt der semantischen CSS-Var-Klassen. Daher kein automatisches Adaptieren.

---

## 4. Dark Mode Tailwind-Klassen — Coverage-Analyse

### Methodik
Gezählt wurden Zeilen mit `bg-white`, `text-gray-900`, `border-gray-200`, `bg-gray-50`, `text-gray-800` ohne `dark:`-Pendant auf derselben Zeile.

### Top-10 Dateien nach Verstoss-Dichte

| Rang | Datei | Verstösse | Zielgruppe |
|------|-------|-----------|------------|
| 1 | `src/app/page.tsx` | 43 | Landing Page (public) |
| 2 | `src/components/builder/templates.tsx` | 30 | Builder (unfertig) |
| 3 | `src/components/boards/LeadDrawer.tsx` | 18 | **Kernfunktion** |
| 4 | `src/app/(dashboard)/reports/page.tsx` | 10 | **Kernfunktion** |
| 5 | `src/components/flow-builder/PromptGenerator.tsx` | 10 | Flow Builder |
| 6 | `src/components/crm/PipelineStage.tsx` | 10 | **Kernfunktion** |
| 7 | `src/components/boards/LeadImportModal.tsx` | 9 | Kernfunktion |
| 8 | `src/app/(dashboard)/boards/[id]/brain/page.tsx` | 9 | Kernfunktion |
| 9 | `src/components/layout/TopNavigation.tsx` | 7 | Globale Nav |
| 10 | `src/components/boards/LeadCard.tsx` | 7 | Kernfunktion |

Weitere relevante Dateien:
- `src/components/layout/UserMenu.tsx`: 6
- `src/components/crm/StatsBar.tsx`: 4 (aber 100% der Cards betroffen)
- `src/app/(dashboard)/admin-bot/page.tsx`: ~4
- `src/components/flow-builder/StateCard.tsx`: 5

### Gesamtzahlen
| Farbe | Zeilen ohne dark: |
|-------|------------------|
| `bg-white` | 64 |
| `text-gray-900` | 73 |
| `border-gray-200` | 50 |
| `bg-gray-50` | 42 |
| `text-gray-800` | 4 |
| **Total** | **~233** |

### Sonderfall: Doppelte dark:-Klassen (A4)
Ca. 30 Stellen mit `dark:bg-gray-900 dark:bg-gray-900` oder `dark:text-gray-400 dark:text-gray-400` (redundant, aber harmlos — CSS ignoriert Duplikate, kein Runtime-Bug).

### Was wird bereits korrekt unterstützt
- Alle Seiten die `dark:bg-gray-900`, `dark:text-white` etc. gesetzt haben (aus Vorsprints)
- shadcn/ui Basis-Komponenten (`/components/ui/`) via CSS-Vars
- Dashboard-Overview und Board-Detail: weitgehend korrekt (viele `dark:` vorhanden)
- Auth-Seiten: weitgehend korrekt

### Prioritäre Fixes nach Impact

**Sofort — Sichtbarste Regressionem:**

| Datei | Problem | Fix-Aufwand |
|-------|---------|-------------|
| `StatsBar.tsx` | 6 Karten komplett weiss in Dark Mode | XS |
| `admin-bot/page.tsx:112,158,207` | Titel + Stats ohne dark: | XS |
| `LeadDrawer.tsx` | 18 Verstösse — Drawer bleibt hell | S |
| `PipelineStage.tsx` | 10 Verstösse — Spalten-Header hell | S |
| `LeadCard.tsx` | 7 Verstösse — Karten in Spalten | S |

**Nicht sofort — niedrigere Priorität:**

| Datei | Warum niedrig |
|-------|---------------|
| `app/page.tsx` | Öffentliche Landing Page, kein Dark-Mode-Toggle dort |
| `builder/templates.tsx` | Builder-Feature unfertig, kein Save-API |
| `PromptGenerator.tsx` | Flow Builder, wenig genutzt pre-launch |
| `TopNavigation.tsx` | Bereits 17 `dark:` Klassen vorhanden; 7 Verstösse sind Reste in `bg-gray-50`-Dropdown |

---

## 5. i18n Coverage auf Settings-Page

### Befund

**`settings/page.tsx` ruft kein einziges `t()` auf** — alle Strings hardcoded:
- "Language", "Timezone", "Dark Mode", "Settings", "Profile", etc.
- Translation-Keys existieren in `translations.ts` für alle diese Strings

**Aber:** Settings-Page ist zur Hälfte "Coming soon". Der minimale Fix (B1) ist nur der Language-State-Bug.

### Hardcoded Strings in anderen Kernseiten
- `dashboard/page.tsx`: "Active", "Inactive", "New Board", "Creating..." — kein `t()` genutzt
- `admin-bot/page.tsx`: Meiste Strings hardcoded ("Admin Bot Monitoring", "Scan for Issues", etc.)
- `reports/page.tsx`: Charts-Labels und Tabellen-Header hardcoded

**Gesamtbild:** t()-Nutzung konzentriert sich auf Navigation, CRM-Pipeline, Flow Builder, Auth. Dashboard-Kernseiten sind größtenteils hardcoded-English.

### Aufwand
- B1 allein: **XS**
- Vollständige i18n auf Dashboard+Reports+Admin: **M**

---

## 6. Recharts Dark Mode

### Was existiert
- Recharts importiert in: `dashboard/page.tsx`, `reports/page.tsx`
- 7x `contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }}`
  - `#E5E7EB` = `gray-200` — im Dark Mode: weisser Tooltip auf dunklem Chart
- `CartesianGrid stroke="#F3F4F6"` — helles Grau, im Dark Mode kaum sichtbar (evtl. OK)
- Achsen-Ticks: `fill: "#9CA3AF"` (gray-400) — akzeptabel in beiden Modi

### Lösungsweg
Recharts liest keine Tailwind `dark:` Klassen. Lösungsweg:
```tsx
const { theme } = useTheme()
const tooltipStyle = {
  borderRadius: "8px",
  border: theme === "dark" ? "1px solid #374151" : "1px solid #E5E7EB",
  backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
  color: theme === "dark" ? "#F9FAFB" : "#111827",
  fontSize: "12px",
}
// Wiederverwendbar als Konstante, an alle 7 Tooltip-Instanzen weitergeben
```

### Aufwand
- **S**: 1 shared Konstante pro Datei + `useTheme()` einbinden → 2 Dateien, ~15 Zeilen

---

## Konkrete File-Liste für Sprint 5 Implementation

### Sprint 5a — Quick Wins (P1+P2, 1–2 Stunden)

| Datei | Was | Zeilen |
|-------|-----|--------|
| `src/app/(dashboard)/settings/page.tsx` | `useState` → `useContext(LanguageContext)` | 3-4 |
| `src/components/crm/StatsBar.tsx` | `dark:bg-gray-900 dark:text-white dark:border-gray-800` auf StatCard | ~8 |
| `src/app/(dashboard)/admin-bot/page.tsx` | `dark:text-white` auf Zeilen 112, 158; dark auf Stat-Cards | ~6 |

### Sprint 5b — Dark Mode Kernseiten (P2, halber Tag)

| Datei | Was | Verstösse |
|-------|-----|-----------|
| `src/components/boards/LeadDrawer.tsx` | `dark:` auf alle bg-white/text-gray-900/border | 18 |
| `src/components/crm/PipelineStage.tsx` | `dark:` auf Spalten-Header und Zähler | 10 |
| `src/components/boards/LeadCard.tsx` | `dark:` auf Karten | 7 |
| `src/components/boards/LeadImportModal.tsx` | `dark:` auf Modal-Inhalte | 9 |
| `src/app/(dashboard)/boards/[id]/brain/page.tsx` | `dark:` auf Restfelder | 9 |
| `src/app/(dashboard)/reports/page.tsx` | `dark:` auf Tabelle + Recharts-Tooltip via useTheme | 10 |
| `src/app/(dashboard)/dashboard/page.tsx` | Recharts-Tooltip via useTheme | 3 Tooltips |

### Sprint 5c — Backlog (P3, nach Launch)

| Datei | Was |
|-------|-----|
| `src/app/page.tsx` | Landing Page Dark Mode (43 Verstösse) |
| `src/components/builder/templates.tsx` | Builder Dark Mode (30 Verstösse) |
| `src/components/flow-builder/PromptGenerator.tsx` | Dark Mode (10 Verstösse) |
| `src/app/(dashboard)/settings/page.tsx` | `t()` für alle hardcoded Strings |
| `src/app/(dashboard)/dashboard/page.tsx` | `t()` für hardcoded EN Strings |

---

## Empfehlung: 2 Mini-Sprints

### Sprint 5a (heute, ~1h)
**Scope:** B1 (Language-Bug) + A1 (StatsBar) + A2 (admin-bot)
- 3 Dateien, ~20 Zeilen
- Sofortiger sichtbarer Effekt auf Dark Mode CRM-Seite
- Language-Bug: P1, muss vor Launch weg

### Sprint 5b (morgen oder übermorgen, ~3h)
**Scope:** LeadDrawer + PipelineStage + LeadCard + reports/page + Recharts-Tooltip
- 6 Dateien, ~60 Zeilen
- Macht die Kernfunktionen (CRM, Reports, Lead-Detail) vollständig dark-mode-fähig
- Recharts-Tooltip: kleiner Einmalbau der `useTheme()`-Hilfskonstante

**Nicht in Sprint 5:** `app/page.tsx` (Landing Page, braucht eigenes Design-Review), `builder/templates.tsx` (Feature unfertig), volle i18n-Abdeckung (separate Aufgabe wenn "Coming soon" Tabs gebaut werden).
