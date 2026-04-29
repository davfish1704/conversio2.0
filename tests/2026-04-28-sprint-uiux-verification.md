# Sprint UI/UX Cleanup — Verifikation
**Datum:** 2026-04-28
**Methode:** Grep + tsc + build (alle Checks von Platte gelesen)

---

## Status-Tabelle

| Check | Erwartung | Ergebnis | Verdict |
|-------|-----------|----------|---------|
| tsc --noEmit | Exit 0 | Exit 0 | PASS |
| npm run build | Exit 0 | Exit 0 | PASS |
| Bell in TopNavigation.tsx | 0 Treffer | 0 Treffer | PASS |
| useContext(LanguageContext) in settings | vorhanden | Zeile 19 | PASS |
| dark: in admin-bot/page.tsx | ≥10 | 13 | PASS |
| dark: in LeadDrawer.tsx | ≥10 | 15 | PASS |
| builder: in features.ts | vorhanden | Zeile 12 | PASS |
| try { in simulate/route.ts | vorhanden | Zeile 61 | PASS |
| onRefresh in success-path ConversioPipeline | nicht vorhanden | nur in Prop-Def + Deps | PASS |

---

## Cluster A — Dark Mode

| Datei | Änderungen |
|-------|-----------|
| `LeadDrawer.tsx` | Modal-Container, Header-Border, h3-Titel, Chat-Border, Inbound-Bubble, Input-Feld, Daten-Panel, Phone/Name/Source/State-Texte, Tags, Textarea, Custom-Fields |
| `PipelineStage.tsx` | Count-Badge, Empty-State |
| `LeadCard.tsx` | Card-Container, Dropdown, Dropdown-Items, Name, Score-Badge, Message-Border, Tags |
| `LeadImportModal.tsx` | Container, Header, Titel, Tab-Switcher, Active-Tab, Form-Inputs (×4), Labels, h3 |
| `reports/page.tsx` | useTheme + tooltipStyle → alle 4 Tooltip-contentStyle ersetzt |
| `dashboard/page.tsx` | useTheme + tooltipStyle → alle Tooltip-contentStyle ersetzt |

## Cluster B — Dead Features

| Änderung | Datei |
|----------|-------|
| Bell-Button + Bell-Import entfernt | TopNavigation.tsx |
| FEATURES.builder → Builder-Nav-Item bedingt | TopNavigation.tsx |
| Tabs auf general + appearance reduziert | settings/page.tsx |
| Timezone-Block entfernt | settings/page.tsx |
| `builder` Feature-Flag hinzugefügt | features.ts |
| Redirect zu /dashboard wenn !FEATURES.builder | builder/page.tsx |

## Cluster C — Language Toggle
**Bereits in Sprint 5a implementiert.** Keine Änderung nötig.

## Cluster D — Admin-Bot Filter

| Änderung | Zeile |
|----------|-------|
| `const [activeFilter, setActiveFilter] = useState("all")` | nach Zeile 21 |
| `filteredReports` berechnet | nach openCount-Berechnungen |
| Filter-Buttons mit onClick + aktiver Hervorhebung | Zeilen 167–175 |
| `reports.map` → `filteredReports.map` | Zeile 185 |
| `reports.length === 0` → `filteredReports.length === 0` | Zeile 179 |

## Cluster E — Bug Fixes

| Fix | Datei | Detail |
|-----|-------|--------|
| try/catch um runAgentLoop | simulate/route.ts | 503 mit deutschem Fehlertext bei Ausfall |
| onRefresh?.() aus Erfolgs-Pfad entfernt | ConversioPipeline.tsx | Kein unnötiger Re-Fetch nach Drag |

---

## Build-Artefakte

- `/tmp/sprint-uiux-tsc.log` — Exit 0, keine Fehler
- `/tmp/sprint-uiux-build.log` — Exit 0, keine neuen Fehler
