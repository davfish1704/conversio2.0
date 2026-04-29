# Sprint 5a: Theme & i18n Quick-Wins — Implementierungsplan
**Datum:** 2026-04-28
**Basis:** audits/2026-04-27-sprint-5-theme-i18n-audit.md
**Modus:** READ-ONLY bis # IMPLEMENT aufgerufen wird

---

## Scope

3 Dateien, ~20 Zeilen netto:

| Datei | Zeilen betroffen | Art der Änderung |
|-------|-----------------|------------------|
| `src/app/(dashboard)/settings/page.tsx` | 3, 23 | LanguageContext statt useState |
| `src/components/crm/StatsBar.tsx` | 24, 32, 33, 128 | dark:-Klassen ergänzen |
| `src/app/(dashboard)/admin-bot/page.tsx` | 112, 152–155, 207 | dark:-Klassen ergänzen |

---

## Schritt 1 — settings/page.tsx: Language-Toggle auf LanguageContext

**File:** `src/app/(dashboard)/settings/page.tsx`
**Aufwand:** XS

**Was geändert wird:**
`useState("en")` für Language wird durch `useContext(LanguageContext)` ersetzt. Die Button-`onClick`-Handler (`setLanguage("en")`, `setLanguage("de")`) und die Conditional-Klassen bleiben unverändert — `setLanguage` aus dem Context persistiert via `/api/user` PATCH und localStorage automatisch.

**Konkrete Änderungen:**

Zeile 3 — Import ergänzen:
```tsx
// IST:
import { useState } from "react"

// WIRD:
import { useState, useContext } from "react"
```

Nach Zeile 4 (nach dem ThemeContext-Import) — neuer Import:
```tsx
import { LanguageContext } from "@/lib/LanguageContext"
```

Zeile 23 — State ersetzen:
```tsx
// IST:
const [language, setLanguage] = useState("en")

// WIRD:
const { language, setLanguage } = useContext(LanguageContext)
```

**Kein weiterer Eingriff:** `t()` wird in 5a NICHT hinzugefügt. Die Strings "Language", "Timezone" etc. bleiben hardcoded. Nur der State-Bug wird behoben.

---

## Schritt 2 — StatsBar.tsx: dark:-Klassen ergänzen

**File:** `src/components/crm/StatsBar.tsx`
**Aufwand:** XS

**Was geändert wird:**
`StatCard` (Zeilen 22–37) und das Lade-Skeleton (Zeile 128) nutzen `bg-white` und `text-gray-*` ohne `dark:`-Pendant. Nur `dark:`-Präfixe werden hinzugefügt — bestehende Klassen bleiben exakt erhalten.

**Konkrete Änderungen:**

Zeile 24 — StatCard-Wrapper:
```tsx
// IST:
<div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">

// WIRD:
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
```

Zeile 32 — Wert-Text:
```tsx
// IST:
<p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>

// WIRD:
<p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
```

Zeile 33 — Label-Text:
```tsx
// IST:
<p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-0.5">{label}</p>

// WIRD:
<p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mt-0.5">{label}</p>
```

Zeile 128 — Skeleton-Karte (Loading-State):
```tsx
// IST:
<div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">

// WIRD:
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
```

*(Zeile 34 — `text-gray-400` — bleibt unverändert; gray-400 ist in Dark Mode ausreichend lesbar)*

---

## Schritt 3 — admin-bot/page.tsx: dark:-Klassen ergänzen

**File:** `src/app/(dashboard)/admin-bot/page.tsx`
**Aufwand:** XS

**Was geändert wird:**
3 Stellen: Seitentitel (h1), die 4 Stat-Karten (Farb-Strings im Array), und ein Report-Karten-Titel (h3). Bestehende Klassen bleiben erhalten.

**Konkrete Änderungen:**

Zeile 112 — Seitentitel h1:
```tsx
// IST:
<h1 className="text-2xl font-bold text-gray-900">Admin Bot Monitoring</h1>

// WIRD:
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Bot Monitoring</h1>
```

Zeilen 152–155 — Stat-Karten Farb-Array (4 Einträge):
```tsx
// IST:
{ label: "Open Reports", value: openCount,  color: "bg-red-50 text-red-700" },
{ label: "Stuck",        value: stuckCount, color: "bg-orange-50 text-orange-700" },
{ label: "Loops",        value: loopCount,  color: "bg-yellow-50 text-yellow-700" },
{ label: "Errors",       value: errorCount, color: "bg-gray-50 dark:bg-black text-gray-700" },

// WIRD:
{ label: "Open Reports", value: openCount,  color: "bg-red-50    dark:bg-red-900/20    text-red-700    dark:text-red-400"    },
{ label: "Stuck",        value: stuckCount, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" },
{ label: "Loops",        value: loopCount,  color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400" },
{ label: "Errors",       value: errorCount, color: "bg-gray-50   dark:bg-gray-800      text-gray-700   dark:text-gray-300"   },
```

Zeile 207 — Report-Karten-Titel h3:
```tsx
// IST:
<h3 className="font-semibold text-gray-900">

// WIRD:
<h3 className="font-semibold text-gray-900 dark:text-white">
```

---

## Schritt 4 — TypeScript-Verifikation

**Befehl:** `npx tsc --noEmit > /tmp/sprint5a-tsc.log 2>&1; echo "Exit: $?"`
**Erwartet:** Exit 0
**Warum:** Schritt 1 ändert einen Import und einen `const`-Typ. Prüfen ob `LanguageContext.setLanguage` den gleichen `(lang: "en" | "de") => void` Typ hat wie `useState`-Setter. (Erwartet: kompatibel, da `setLanguage` aus Context `(lang: Language) => Promise<void>` ist und die Buttons nur `"en"` oder `"de"` übergeben.)

---

## Test-Plan (nach Implementation)

### Test 1 — Language-Toggle
1. Browser: `/settings` öffnen
2. Auf **DE** klicken
3. Zu `/crm` navigieren → Navigation und CRM-Labels müssen auf Deutsch wechseln
4. Reload der Settings-Seite → DE-Button muss aktiv (blau) sein (localStorage-Persistenz)
5. `/api/user` im Network-Tab prüfen → PATCH-Request mit `{ language: "de" }` muss gesendet worden sein

### Test 2 — StatsBar Dark Mode
1. Dark Mode aktivieren (Appearance-Tab in Settings)
2. `/crm` öffnen → alle 6 StatsBar-Karten müssen dunklen Hintergrund zeigen
3. `/reports` öffnen → gleiche StatsBar, gleicher Test
4. Loading-State checken: kurz Netzwerk auf Slow 3G drosseln → Skeleton-Karten ebenfalls dunkel

### Test 3 — Admin-Bot Dark Mode
1. Dark Mode aktiv, `/admin-bot` öffnen
2. Seitentitel "Admin Bot Monitoring" muss in weiss/hell erscheinen
3. 4 Stat-Karten (Open Reports / Stuck / Loops / Errors) müssen dunkle Hintergründe haben
4. Falls Reports vorhanden: Karten-Titel in der Liste müssen lesbar sein

### Nicht zu testen in 5a
- LeadDrawer, PipelineStage, LeadCard (5b)
- Recharts Tooltip (5b)
- app/page.tsx Landing (out of scope)

---

## Stop-Kriterien

- Wenn `tsc --noEmit` nach Schritt 1 fehlt → analysieren, nicht blind fixen
- Wenn `setLanguage` aus LanguageContext eine andere Signatur hat als erwartet → Issue dokumentieren, nicht workaround einbauen
- Wenn nach Schritt 3 in admin-bot neue Verstösse sichtbar werden → als Issue für 5b dokumentieren, nicht scope-creepen
