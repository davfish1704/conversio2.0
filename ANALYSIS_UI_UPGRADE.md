# Conversio 2.0 – UI/UX Upgrade & Feature Analysis

**Datum:** 2026-04-23  
**Stand:** Nach mehreren Fix-Sessions (Middleware, Auth, Dead Ends, Rate-Limiting, Integrations)

---

## ZUSAMMENFASSUNG

| Metrik | Wert |
|--------|------|
| TypeScript-Fehler | **0** ✅ |
| Server-Status | **Läuft** ✅ |
| Pages | 18 |
| API Routes | 48 |
| Components | 31 |
| Dead Ends | **0** (alle behoben) |

---

## 1. ALLE PAGES & COMPONENTS

### 1.1 Pages (18)

| Route | Pfad | Status | Anmerkung |
|-------|------|--------|-----------|
| `/` (Marketing) | `src/app/(marketing)/page.tsx` | ✅ | Landing Page |
| `/login` | `src/app/(auth)/login/page.tsx` | ✅ | NextAuth Credentials + Google |
| `/signup` | `src/app/signup/page.tsx` | ✅ | Eigene API-Route |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | ⚠️ | Nur Text-Loading |
| `/crm` | `src/app/(dashboard)/crm/page.tsx` | ✅ | Pipeline + Kanban |
| `/boards` | `src/app/(dashboard)/boards/page.tsx` | ⚠️ | Redirect zu `/crm` |
| `/boards/[id]` | `src/app/(dashboard)/boards/[id]/page.tsx` | ✅ | Board-Detail mit Pipeline |
| `/boards/[id]/flow` | `src/app/(dashboard)/boards/[id]/flow/page.tsx` | ✅ | Flow-Builder |
| `/boards/[id]/brain` | `src/app/(dashboard)/boards/[id]/brain/page.tsx` | ✅ | BrainLab (KI-Wissen) |
| `/boards/[id]/assets` | `src/app/(dashboard)/boards/[id]/assets/page.tsx` | ✅ | Dateien/Assets |
| `/boards/[id]/settings` | `src/app/(dashboard)/boards/[id]/settings/page.tsx` | ✅ | Board-Einstellungen |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | ⚠️ | Billing hartcodiert |
| `/team` | `src/app/(dashboard)/team/page.tsx` | ✅ | Team-Management |
| `/reports` | `src/app/(dashboard)/reports/page.tsx` | ✅ | Admin Reports (jetzt scrollable) |
| `/admin-bot` | `src/app/(dashboard)/admin-bot/page.tsx` | ✅ | Admin-Dashboard |
| `/whatsapp` | `src/app/(dashboard)/whatsapp/page.tsx` | ✅ | WhatsApp Connect/Disconnect |
| `/builder` | `src/app/(dashboard)/builder/page.tsx` | ✅ | Landing Page Builder (neu) |

### 1.2 Components (31)

**boards/** (12)
- `BoardNav.tsx`, `BoardSkeleton.tsx`, `BoardTabs.tsx`
- `CRMSkeleton.tsx`, `EmptyStateCard.tsx`
- `KanbanColumn.tsx`, `LeadCard.tsx`, `LeadDrawer.tsx`
- `LeadImportModal.tsx`, `PipelineBoard.tsx`, `SortableLeadCard.tsx`

**crm/** (4)
- `ConversioLeadCard.tsx`, `ConversioPipeline.tsx`, `PipelineStage.tsx`, `StatsBar.tsx`

**flow-builder/** (4)
- `FlowBuilder.tsx`, `PromptGenerator.tsx`, `StateCard.tsx`, `StateForm.tsx`

**layout/** (2)
- `TopNavigation.tsx`, `UserMenu.tsx`

**ui/** (7 shadcn-Komponenten)
- `badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`
- `select.tsx`, `skeleton.tsx`, `tabs.tsx`

**Sonstige**
- `LanguageToggle.tsx`

**Ungenutzt/Tot:**
- `KanbanBoard.tsx` (volle Dnd-Kit Implementierung, nie importiert)
- `WhatsAppConnect.tsx` (Dummy, nie importiert)
- `textarea.tsx` (nie verwendet, natives `<textarea>` wird genutzt)

### 1.3 API Routes (48)

| Bereich | Routen |
|---------|--------|
| Auth | `/api/auth/[...nextauth]`, `/api/auth/signup` |
| User | `/api/user` |
| Team | `/api/team`, `/api/team/invite`, `/api/team/members/[id]` |
| Boards | `/api/boards`, `/api/boards/[id]/*` (7 Sub-Routen) |
| Conversations | `/api/conversations/*` (5 Routen inkl. freeze) |
| CRM | `/api/crm/pipeline` |
| AI | `/api/ai/chat`, `/api/ai/generate-flow` |
| WhatsApp | `/api/whatsapp/*` (5 Routen) + `/api/webhook/whatsapp` |
| Integrations | `/api/integrations`, `/api/integrations/nango` |
| Meta | `/api/meta/leads` |
| Reports | `/api/reports`, `/api/admin/*` (3 Routen) |
| System | `/api/health`, `/api/debug` |

---

## 2. AUTH & MIDDLEWARE ANALYSE

### 2.1 Aktueller Stand

| Datei | Status | Details |
|-------|--------|---------|
| `src/auth.ts` | ✅ | NextAuth v5 mit PrismaAdapter, Google + Credentials, JWT |
| `src/middleware.ts` | ✅ | Schützt API + Dashboard, erlaubt Public APIs (`/api/health`, `/api/webhook`) |
| `src/app/(dashboard)/layout.tsx` | ✅ | Redirect zu `/login` wenn nicht eingeloggt |

### 2.2 Login-Bug Analyse

**Befund:** Der Login-Flow ist **code-seitig sauber**. Es gibt keinen offensichtlichen 500-Fehler in der Implementierung.

**Mögliche Ursachen für "500 Error bei Login":**

1. **Datenbank-Verbindung** – Wenn `DATABASE_URL` falsch ist, schlägt `prisma.user.findUnique()` fehl
2. **PrismaAdapter mit leerer DB** – Nach dem Hinzufügen des PrismaAdapters erwartet NextAuth die Tabellen `Account`, `Session`, `VerificationToken`. Wenn diese leer sind oder Migrationen fehlen, könnte es zu Fehlern kommen.
3. **Google OAuth Config** – `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` fehlen in `.env.local` (nur in `.env` vorhanden, nicht in `.env.local`)
4. **NEXTAUTH_SECRET** – Unterschiedliche Werte in `.env` vs `.env.local` könnten JWT-Probleme verursachen
5. **Session-Strategie-Konflikt** – PrismaAdapter + JWT-Strategy ist eine ungewöhnliche Kombination. Normalerweise nutzt man entweder JWT (stateless) ODER Datenbank-Sessions (mit Adapter). Die Kombination kann inkonsistentes Verhalten verursachen.

**Empfohlener Fix:**
```typescript
// auth.ts: Entscheiden zwischen JWT oder Datenbank-Session
// Option A (empfohlen für Vercel): JWT ohne Adapter
session: { strategy: "jwt" }
// Adapter entfernen

// Option B (für Multi-Server): Datenbank-Session
session: { strategy: "database" }
// Adapter behalten
```

---

## 3. FEHLENDE DEPENDENCIES

### 3.1 Für geplante Features

| Feature | Package | Install-Command | Status |
|---------|---------|-----------------|--------|
| **Charts/Dashboard** | `recharts` | `npm install recharts` | ❌ Fehlt |
| **Icons** | `lucide-react` | `npm install lucide-react` | ❌ Fehlt |
| **Animationen** | `framer-motion` | `npm install framer-motion` | ❌ Fehlt |
| **shadcn Charts** | `@radix-ui/react-*` | Teil von shadcn init | ❌ Fehlt |
| **Nango** | `@nangohq/node` | Bereits installiert! ✅ | ✅ Vorhanden |

### 3.2 Empfohlene shadcn/ui Erweiterungen

```bash
npx shadcn add dialog dropdown-menu toast progress avatar separator scroll-area
```

### 3.3 Für Pipeline-Redesign

| Package | Zweck |
|---------|-------|
| `@dnd-kit/core` | ✅ Bereits installiert |
| `@dnd-kit/sortable` | ✅ Bereits installiert |
| `@dnd-kit/utilities` | ✅ Bereits installiert |

→ Drag & Drop ist bereits vollständig vorhanden!

### 3.4 Für Website-Builder

| Package | Zweck |
|---------|-------|
| `react-frame-component` | Iframe-Preview für Landingpages |
| `html-to-image` | Thumbnail-Generierung |

---

## 4. IMPLEMENTATIONS-REIHENFOLGE

### Phase 1: Foundation (Woche 1)

| # | Feature | Priorität | Aufwand |
|---|---------|-----------|---------|
| 1 | **Login-Bug fixen** | 🔴 Kritisch | 2-4h |
| 2 | **lucide-react + framer-motion installieren** | 🔴 Kritisch | 15min |
| 3 | **shadcn/ui Komponenten erweitern** (Dialog, Toast, Avatar) | 🟡 Hoch | 1h |
| 4 | **TypeScript-Typen vervollständigen** (`any` in Builder, WhatsApp Settings) | 🟡 Hoch | 2h |

### Phase 2: Design-System & Pipeline (Woche 1-2)

| # | Feature | Priorität | Aufwand |
|---|---------|-----------|---------|
| 5 | **TopNavigation redesign** (mit Icons, Notifications, globaler Search) | 🟡 Hoch | 4-6h |
| 6 | **Pipeline fullscreen Kanban** (HubSpot-Style: mehr Spalten, Lead-Count, drag-over-States) | 🟡 Hoch | 8-12h |
| 7 | **LeadCard redesign** (Avatar, Tags, Score-Badge, letzte Aktivität) | 🟡 Hoch | 4-6h |
| 8 | **LeadDrawer redesign** (Tabs: Chat, Info, Timeline, Notes) | 🟡 Hoch | 6-8h |

### Phase 3: Dashboard & Reports (Woche 2)

| # | Feature | Priorität | Aufwand |
|---|---------|-----------|---------|
| 9 | **recharts installieren + Chart-Komponenten** | 🟡 Hoch | 2h |
| 10 | **Dashboard mit Charts** (Lead-Volume, Conversion-Rate, Channel-Pie) | 🟡 Hoch | 6-8h |
| 11 | **Reports mit Export** (CSV/PDF, Date-Range-Filter) | 🟡 Mittel | 4-6h |
| 12 | **StatsBar erweitern** (echte Zahlen statt Placeholder) | 🟡 Mittel | 2-3h |

### Phase 4: Website-Builder (Woche 3)

| # | Feature | Priorität | Aufwand |
|---|---------|-----------|---------|
| 13 | **Builder: Live-Preview** (nicht JSON, echte HTML-Vorschau) | 🟢 Mittel | 8-12h |
| 14 | **Builder: Templates** (3-5 vorgefertigte Templates) | 🟢 Mittel | 6-8h |
| 15 | **Builder: Publish** (zu DB speichern, öffentliche URL generieren) | 🟢 Mittel | 4-6h |
| 16 | **Builder: Form-Handling** (Lead-Einträge direkt in CRM) | 🟢 Niedrig | 4-6h |

### Phase 5: Polish & Integrations (Woche 3-4)

| # | Feature | Priorität | Aufwand |
|---|---------|-----------|---------|
| 17 | **WhatsApp: Template-Messages** (Quick-Replies, Buttons) | 🟢 Niedrig | 4-6h |
| 18 | **Nango: OAuth-Flow UI** (Connect-Buttons für Slack, Calendar, etc.) | 🟢 Niedrig | 6-8h |
| 19 | **Mobile Responsiveness** (Pipeline-Scroll, Drawer auf Mobile) | 🟢 Niedrig | 4-6h |
| 20 | **Dark Mode** | 🟢 Optional | 4-6h |

---

## 5. AUFWANDSSCHÄTZUNG PRO FEATURE

### 5.1 Pipeline-Redesign (HubSpot-Style)

**Gesamtschätzung: 18-26h**

| Sub-Feature | Aufwand | Details |
|-------------|---------|---------|
| Fullscreen-Layout (ohne Padding, volle Breite) | 2h | CSS-Anpassungen in Layout + Pipeline |
| Spalten-Header mit Lead-Count + Add-Button | 2h | Neue Komponente `PipelineColumnHeader` |
| LeadCard-Redesign (Thumbnail, Tags, Score) | 4h | `ConversioLeadCard.tsx` überarbeiten |
| Drag-Overlay verbessern (Ghost-Card mit Details) | 2h | Dnd-Kit DragOverlay stylen |
| Quick-Filter (Neu, Heute, Opt-in, etc.) | 4h | Filter-Logik + UI |
| Unassigned-Leads Area (Top-Bereich) | 2h | Bereits vorhanden, nur stylen |
| Mobile: Horizontaler Scroll mit Snap | 2-4h | Touch-Optimierung |

### 5.2 Reports/Dashboard (Charts)

**Gesamtschätzung: 12-17h**

| Sub-Feature | Aufwand | Details |
|-------------|---------|---------|
| recharts installieren + Setup | 1h | `npm install recharts` |
| Lead-Volume Chart (Line/Area) | 2h | Zeitraum: 7/30/90 Tage |
| Conversion Funnel Chart | 2h | Bar-Chart mit States |
| Channel-Pie-Chart | 2h | WhatsApp vs. Email vs. Meta |
| Profitabilität pro Lead | 3h | Kosten (API-Usage) vs. Wert |
| Dashboard-Grid Layout | 2h | Responsive Grid mit Cards |
| Date-Range-Picker | 2-3h | Filter für alle Charts |

### 5.3 Website-Builder

**Gesamtschätzung: 22-32h**

| Sub-Feature | Aufwand | Details |
|-------------|---------|---------|
| Live-Preview (kein JSON, echte HTML) | 6-8h | Iframe oder dynamisches Rendering |
| Section-Templates (Hero, Form, CTA, Footer) | 4-6h | Vorgefertigte JSX-Templates |
| Drag-and-Drop für Sections | 4-6h | Dnd-Kit für Sections |
| Publish + öffentliche URL | 4-6h | DB-Schema + Route `/lp/[slug]` |
| Form-Handling (Leads → CRM) | 4-6h | API-Route für Form-Submits |

### 5.4 Login-Bug Fix

**Gesamtschätzung: 2-4h**

| Mögliche Ursache | Fix | Aufwand |
|------------------|-----|---------|
| PrismaAdapter + JWT Konflikt | Entweder Adapter entfernen ODER `strategy: "database"` | 30min |
| `.env` / `.env.local` Inkonsistenz | Variablen vereinheitlichen | 30min |
| Datenbank-Tabellen fehlen | `prisma db push` oder Migration | 15min |
| NextAuth Debug-Logging | `debug: true` setzen, Logs analysieren | 1-2h |

---

## 6. EMPFEHLUNG: WO ANFANGEN?

### Sofort (heute):
1. `npm install lucide-react framer-motion recharts`
2. Login-Bug diagnostizieren (`debug: true` in `auth.ts`, Logs prüfen)
3. `npx shadcn add dialog toast avatar progress`

### Diese Woche:
4. TopNavigation mit lucide-Icons neu gestalten
5. Pipeline-Layout auf fullscreen umstellen
6. LeadCard mit Tags + Score-Badge

### Nächste Woche:
7. Dashboard mit 3 Charts (Volume, Funnel, Channel)
8. StatsBar mit echten Zahlen verbinden

### Danach:
9. Builder Live-Preview
10. Mobile Responsiveness für Pipeline

---

## 7. KRITISCHE ENTDECKUNGEN

### ✅ Gute Nachrichten:
- **0 TypeScript-Fehler** – Code ist sauber
- **Server läuft stabil** – Health-Check OK
- **Alle Dead Ends behoben** – Keine 404er mehr im Frontend
- **Middleware aktiv** – Auth funktioniert zentral
- **Rate-Limiting vorhanden** – Signup, AI, WhatsApp geschützt
- **Dnd-Kit bereits installiert** – Pipeline-Redesign kann sofort starten

### ⚠️ Warnungen:
- **PrismaAdapter + JWT** sind inkonsistent kombiniert
- **Builder-Page** hat `any`-Typen (TypeScript-Risiko)
- **Billing-Tab** immer noch hartcodiert
- **Keine Icons** – Überall nur Emojis statt lucide-react
- **Keine Animationen** – Kein framer-motion für Übergänge

---

*Analyse basiert auf systematischer Code-Prüfung mit tsc, curl, find, cat, grep.*
