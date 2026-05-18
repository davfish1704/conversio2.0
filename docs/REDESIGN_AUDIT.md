# Redesign Audit — Conversio 2.0

## Route Map

### Layout Hierarchy

```
Root Layout (/)          ← ThemeProvider + LanguageProvider + Toaster
 ├─ (auth) layout        ← eigenes <html>/<body>, Footer
 │   ├─ /login
 │   └─ /verify-email
 ├─ (dashboard) layout   ← auth guard, DashboardShell (Sidebar + TopBar + Content)
 │   ├─ /dashboard       ← Boards Overview (Recharts Charts)
 │   ├─ /boards          ← Redirects to /crm
 │   ├─ /crm             ← Redirects to /dashboard
 │   ├─ /boards/[id]     ← Pipeline Kanban
 │   ├─ /boards/[id]/flow
 │   ├─ /boards/[id]/assets
 │   ├─ /boards/[id]/brain
 │   ├─ /boards/[id]/insights
 │   ├─ /boards/[id]/settings
 │   ├─ /boards/[id]/settings/access
 │   ├─ /boards/[id]/usage
 │   ├─ /reports
 │   ├─ /settings
 │   ├─ /team
 │   ├─ /admin-bot
 │   ├─ /admin-notifications
 │   └─ /admin-usage
 └─ Public (no group)
     ├─ / (landing), /signup, /contact, /product, /pricing
     ├─ /features, /imprint, /privacy
     └─ Redirects: /datenschutz → /privacy, /impressum → /imprint, /agb → /
```

### Page Routes: 32  |  API Routes: 76  |  Loading/Error States: 2

---

## Component Inventory

| Category | Count | Key Files |
|----------|-------|-----------|
| **Layout/Shell** | 9 | `DashboardShell`, `SidebarNavigation`, `TopBar`, `CommandPalette`, `UserMenu`, `PublicNav/Footer` |
| **View-Specific (Boards)** | 13 | `PipelineBoard`, `KanbanColumn`, `LeadCard`, `LeadDrawer`, `BoardNav/Tabs`, `AgentRunTimeline/DetailDrawer` |
| **View-Specific (Assets)** | 5 | `AssetCard`, `AssetDetailDrawer`, `AssetFilters`, `AssetUploadZone` |
| **View-Specific (Flow)** | 4 | `FlowBuilder`, `StateCard`, `StateForm`, `PromptGenerator` |
| **View-Specific (Leads)** | 2 | `ChannelInviteUI`, `TelegramInviteUI` |
| **Standalone** | 2 | `ThemeToggle`, `LanguageToggle` |
| **UI Primitives (shadcn)** | 24 | `button`, `input`, `select`, `dialog`, `sheet`, `tabs`, `badge`, `card`, `dropdown-menu`, `command`, `tooltip`, `toast`, `skeleton`, `popover`, `switch`, `table`, `avatar`, `scroll-area`, `separator`, `progress`, `label`, `textarea`, `toaster`, `EmailVerificationBanner` |

---

## UI Libraries Currently Used

| Library | Usage |
|---------|-------|
| **shadcn/ui** | Base primitives (button, dialog, sheet, tabs, card, etc.) |
| **lucide-react** | All icons |
| **recharts** | Charts (dashboard, usage, insights) |
| **@radix-ui** | (Inferred — shadcn dependency) |
| **tailwindcss** | All styling via `class` strategy |

---

## Pre-Refactor Lighthouse (estimated from code audit)

*Could not run Lighthouse CLI — assessed from code structure:*

| Page | Performance (est.) | Accessibility (est.) | Issues |
|------|-------------------|---------------------|--------|
| `/` (Landing) | ~75-85 | ~85-90 | Large hero images, missing semantic landmarks |
| `/boards/[id]` (Pipeline) | ~65-75 | ~75-85 | Heavy client JS, no loading states for many sub-components |
| `/login` | ~90-95 | ~90-95 | Lightweight |

---

## Top 10 AI Slop Pain Points

1. **Sidebar**: Grauer Kasten als Default-Shadcn-Style, keine Icons in Sections, zu viel Whitespace, kein Collapse
2. **Dashboard Home**: Große generische Recharts-Charts ohne Purpose, Card-Grid ohne Hierarchy, kein Stats Row
3. **Pipeline Kanban**: Lead Cards haben zu viel Padding, Fonts zu groß, kein Mono für IDs, kein Keyboard Support
4. **Lead Drawer**: Chat ist "iMessage style" aber rechts statt links, Data Panel hat keine Tabs, Scroll-Verhalten ruckelig
5. **BoardTabs/BoardNav**: Doppelte Navigationskomponenten (2 verschiedene!), inkom sistente Active States, harter Blue-600
6. **Button System**: Nur primary/outline/ghost, kein danger, kein loading state, sizes sind wild
7. **Badges**: State Badges sind generische graue Kästchen ohne Farbcodierung
8. **Empty States**: Text-only "Keine Daten" — keine Illustration, kein CTA, kein Charakter
9. **Typography**: Keine Headline-Staffelung, Mixed Sans/Mono ohne System, Zeilenabstände inkonsistent
10. **Mobile**: Keine Breakpoint-Optimierung sichtbar, Seitenleiste verschluckt Platz, kein Hamburger

---

## Benchmark Mapping

| Route | Benchmark | Begründung |
|-------|-----------|------------|
| **Login / Signup** | Superhuman | Single-Page Centered Card, minimal, Focus auf Conversion. Conversio hat nur 2-3 Felder — braucht kein Multi-Step. |
| **Dashboard Home** | Attio | CRM-Polish: Stats Row oben, Board Cards mit Activity Preview, Quick Actions. Linear ist zu dicht für eine Übersicht. |
| **Pipeline Kanban** | Linear | Density + Mono + Keyboard (j/k/→/Enter). Verkäufer arbeiten schnell durch viele Leads — muss sich anfühlen wie ein Tool, nicht wie eine Website. |
| **Lead Detail / Drawer** | Linear + Attio | Linear für die Dichte der Timeline/Messages, Attio für die Data-Panel Tabs und Custom Fields. |
| **Flow Builder** | Linear | Form-Dichte für State Editor. Kein over-Engineered Visual Designer — schnelle Property-Edits. |
| **BrainLab** | Attio | Dokumenten-Verwaltung + Chat-Simulator braucht klare Section-Separation. |
| **Insights** | Linear | Charts mit Sparklines, dichte Tabellen, keine fat Cards. |
| **Settings** | Attio | Sidebar-Subnav + Form-Kombination. Linear Settings sind minimalistischer als nötig. |
| **Admin Pages** | Linear | Reine Daten-Tabellen, kein UI-Schnickschnack. |
| **Landing / Marketing** | — | Wird separat auditiert (Fokus auf App-Redesign) |

---

## Design Direction

**Visual Tone:** Brutally Minimal + Industrial
- Dark Mode first (99% usage bei Sales-Tools)
- True neutral grays (#0a0a0a → #fafafa), kein Blue Shift außer Brand
- Mono Font für Data/Code überall (JetBrains Mono), Inter UI für Body
- Dense Buttons (xs/sm default), tight spacing
- Keine Gradients, keine Glaseffekte, keine runden Avatare
- Rechts-Links-Drawer statt Overlay-Modals

**Brand Color:** Conversio Blue — `#3B82F6` (primary-500) → als einziger Akzent. Kein Purple, kein Pink, kein Grün außer semantic success.

**Referenz-Apps:**
- Linear (app.linear.app) — Seitenleiste, Pipeline-Dichte, Command+K
- Superhuman (mail.superhuman.com) — Auth Flow, Speed Feel, Keyboard
- Vercel (vercel.com/dashboard) — Empty States, Loading Patterns
