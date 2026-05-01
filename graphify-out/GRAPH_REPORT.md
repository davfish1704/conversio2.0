# Graph Report - .  (2026-05-01)

## Corpus Check
- 181 files · ~87,065 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 418 nodes · 462 edges · 98 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Access Control|Auth & Access Control]]
- [[_COMMUNITY_Reports & Document Management|Reports & Document Management]]
- [[_COMMUNITY_AI Flow Generation|AI Flow Generation]]
- [[_COMMUNITY_Project Architecture|Project Architecture]]
- [[_COMMUNITY_AI Agent Engine|AI Agent Engine]]
- [[_COMMUNITY_Security Sprints & Audit|Security Sprints & Audit]]
- [[_COMMUNITY_Theme & Internationalization|Theme & Internationalization]]
- [[_COMMUNITY_SmartDummy AI Simulator|SmartDummy AI Simulator]]
- [[_COMMUNITY_Page Builder|Page Builder]]
- [[_COMMUNITY_Flow State Management|Flow State Management]]
- [[_COMMUNITY_Utility Formatters|Utility Formatters]]
- [[_COMMUNITY_Conversation Actions|Conversation Actions]]
- [[_COMMUNITY_Channel Settings|Channel Settings]]
- [[_COMMUNITY_Board Management|Board Management]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Shadcn UI Primitives|Shadcn UI Primitives]]
- [[_COMMUNITY_Prompt & Flow Generator|Prompt & Flow Generator]]
- [[_COMMUNITY_Lead Import|Lead Import]]
- [[_COMMUNITY_Board Assets|Board Assets]]
- [[_COMMUNITY_Navigation|Navigation]]
- [[_COMMUNITY_Module 20|Module 20]]
- [[_COMMUNITY_Module 21|Module 21]]
- [[_COMMUNITY_Module 22|Module 22]]
- [[_COMMUNITY_Module 23|Module 23]]
- [[_COMMUNITY_Module 24|Module 24]]
- [[_COMMUNITY_Module 25|Module 25]]
- [[_COMMUNITY_Module 26|Module 26]]
- [[_COMMUNITY_Module 27|Module 27]]
- [[_COMMUNITY_Module 28|Module 28]]
- [[_COMMUNITY_Module 29|Module 29]]
- [[_COMMUNITY_Module 30|Module 30]]
- [[_COMMUNITY_Module 31|Module 31]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 34|Module 34]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 36|Module 36]]
- [[_COMMUNITY_Module 37|Module 37]]
- [[_COMMUNITY_Module 38|Module 38]]
- [[_COMMUNITY_Module 39|Module 39]]
- [[_COMMUNITY_Module 40|Module 40]]
- [[_COMMUNITY_Module 41|Module 41]]
- [[_COMMUNITY_Module 42|Module 42]]
- [[_COMMUNITY_Module 43|Module 43]]
- [[_COMMUNITY_Module 44|Module 44]]
- [[_COMMUNITY_Module 45|Module 45]]
- [[_COMMUNITY_Module 46|Module 46]]
- [[_COMMUNITY_Module 47|Module 47]]
- [[_COMMUNITY_Module 48|Module 48]]
- [[_COMMUNITY_Module 49|Module 49]]
- [[_COMMUNITY_Module 50|Module 50]]
- [[_COMMUNITY_Module 51|Module 51]]
- [[_COMMUNITY_Module 52|Module 52]]
- [[_COMMUNITY_Module 53|Module 53]]
- [[_COMMUNITY_Module 54|Module 54]]
- [[_COMMUNITY_Module 55|Module 55]]
- [[_COMMUNITY_Module 56|Module 56]]
- [[_COMMUNITY_Module 57|Module 57]]
- [[_COMMUNITY_Module 58|Module 58]]
- [[_COMMUNITY_Module 59|Module 59]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]
- [[_COMMUNITY_Module 64|Module 64]]
- [[_COMMUNITY_Module 65|Module 65]]
- [[_COMMUNITY_Module 66|Module 66]]
- [[_COMMUNITY_Module 67|Module 67]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 70|Module 70]]
- [[_COMMUNITY_Module 71|Module 71]]
- [[_COMMUNITY_Module 72|Module 72]]
- [[_COMMUNITY_Module 73|Module 73]]
- [[_COMMUNITY_Module 74|Module 74]]
- [[_COMMUNITY_Module 75|Module 75]]
- [[_COMMUNITY_Module 76|Module 76]]
- [[_COMMUNITY_Module 77|Module 77]]
- [[_COMMUNITY_Module 78|Module 78]]
- [[_COMMUNITY_Module 79|Module 79]]
- [[_COMMUNITY_Module 80|Module 80]]
- [[_COMMUNITY_Module 81|Module 81]]
- [[_COMMUNITY_Module 82|Module 82]]
- [[_COMMUNITY_Module 83|Module 83]]
- [[_COMMUNITY_Module 84|Module 84]]
- [[_COMMUNITY_Module 85|Module 85]]
- [[_COMMUNITY_Module 86|Module 86]]
- [[_COMMUNITY_Module 87|Module 87]]
- [[_COMMUNITY_Module 88|Module 88]]
- [[_COMMUNITY_Module 89|Module 89]]
- [[_COMMUNITY_Module 90|Module 90]]
- [[_COMMUNITY_Module 91|Module 91]]
- [[_COMMUNITY_Module 92|Module 92]]
- [[_COMMUNITY_Module 93|Module 93]]
- [[_COMMUNITY_Module 94|Module 94]]
- [[_COMMUNITY_Module 95|Module 95]]
- [[_COMMUNITY_Module 96|Module 96]]
- [[_COMMUNITY_Module 97|Module 97]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 47 edges
2. `GET()` - 38 edges
3. `toast()` - 21 edges
4. `PATCH()` - 13 edges
5. `SmartDummyAI` - 11 edges
6. `jsonError()` - 10 edges
7. `Plan: Sprint 4 AI Agent Engine mit Tool-Calling` - 10 edges
8. `PUT()` - 9 edges
9. `processAgentResponse()` - 9 edges
10. `DELETE()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `getNextStateName()` --calls--> `GET()`  [INFERRED]
  src/components/flow-builder/FlowBuilder.tsx → src/app/api/debug/route.ts
- `generateWithAI()` --calls--> `toast()`  [INFERRED]
  src/app/(dashboard)/builder/page.tsx → src/hooks/use-toast.ts
- `Conversio Corp v2.0 - Datenbank-Fundament` --conceptually_related_to--> `CLAUDE.md — Conversio2.0 Projekt-Kontext`  [INFERRED]
  README.md → CLAUDE.md
- `ConversationMemory Prisma Model` --conceptually_related_to--> `prisma/schema.prisma (8 Tabellen)`  [INFERRED]
  plans/2026-04-27-sprint-4-ai-engine-plan.md → README.md
- `Tech Stack: Next.js 14 + TypeScript + Prisma + Tailwind + shadcn/ui` --conceptually_related_to--> `Supabase PostgreSQL`  [INFERRED]
  CLAUDE.md → README.md

## Communities

### Community 0 - "Auth & Access Control"
Cohesion: 0.07
Nodes (9): assertBoardMemberAccess(), assertConversationOwnership(), assertReportOwnership(), assertTeamMemberInOwnTeam(), DELETE(), GET(), jsonError(), PATCH() (+1 more)

### Community 1 - "Reports & Document Management"
Cohesion: 0.09
Nodes (24): deleteReport(), fetchReports(), handleScan(), resolveReport(), addDocument(), addFAQ(), addRule(), connectTelegram() (+16 more)

### Community 2 - "AI Flow Generation"
Cohesion: 0.08
Nodes (14): generateFlowStates(), generateWhatsAppFollowUp(), generateWhatsAppGreeting(), groqChat(), qualifyLead(), rateLimit(), checkBoardAccess(), extractContent() (+6 more)

### Community 3 - "Project Architecture"
Cohesion: 0.1
Nodes (28): 48 API Routes, src/auth.ts (NextAuth v5 + PrismaAdapter), 31 Components, @dnd-kit/core + @dnd-kit/sortable, src/middleware.ts, 18 App Pages, Conversio 2.0 UI/UX Upgrade & Feature Analysis, Alkaio (WhatsApp Lead-Automation Schwesterprodukt) (+20 more)

### Community 4 - "AI Agent Engine"
Cohesion: 0.11
Nodes (20): processAgentResponse(), generateAIResponse(), getFallbackResponse(), groqChatWithTools(), createNotification(), buildPrompt(), checkStateTransition(), evaluateCondition() (+12 more)

### Community 5 - "Security Sprints & Audit"
Cohesion: 0.15
Nodes (21): auth-helpers.ts (assertBoardMemberAccess, assertTeamMemberInOwnTeam), scripts/seed-test-users.ts, CHANGELOG Multi-Tenant Security Sprint 2, CHANGELOG Sprint 3: Final Hardening Verification, Sprint 2 BLOCKERs: brain/simulate + team/members, Sprint-Summary: Multi-Tenant Security Sprint 2, Vercel Deploy Checkliste (Pre-Launch), Rate Limit Callsites (login, signup, ai, whatsapp) (+13 more)

### Community 6 - "Theme & Internationalization"
Cohesion: 0.12
Nodes (20): Sprint 5 Theme & i18n Audit, Dark Mode Tailwind-Klassen Coverage (~233 Verstösse), LanguageContext + translations.ts (830 Zeilen), Recharts Dark Mode (inline style, useTheme fix), ThemeContext (src/lib/ThemeContext.tsx), Plan: Sprint 5a Theme & i18n Quick-Wins, src/app/(dashboard)/admin-bot/page.tsx (dark mode), LanguageContext (@/lib/LanguageContext) (+12 more)

### Community 7 - "SmartDummy AI Simulator"
Cohesion: 0.3
Nodes (1): SmartDummyAI

### Community 8 - "Page Builder"
Cohesion: 0.22
Nodes (1): generateWithAI()

### Community 9 - "Flow State Management"
Cohesion: 0.29
Nodes (1): getNextStateName()

### Community 10 - "Utility Formatters"
Cohesion: 0.33
Nodes (2): getAvatarColor(), hashString()

### Community 11 - "Conversation Actions"
Cohesion: 0.33
Nodes (0): 

### Community 12 - "Channel Settings"
Cohesion: 0.4
Nodes (0): 

### Community 13 - "Board Management"
Cohesion: 0.4
Nodes (1): formatShortDate()

### Community 14 - "Theme System"
Cohesion: 0.4
Nodes (2): useTheme(), ThemeToggle()

### Community 15 - "Shadcn UI Primitives"
Cohesion: 0.4
Nodes (0): 

### Community 16 - "Prompt & Flow Generator"
Cohesion: 0.5
Nodes (2): generateFlow(), handleRegenerate()

### Community 17 - "Lead Import"
Cohesion: 0.4
Nodes (0): 

### Community 18 - "Board Assets"
Cohesion: 0.5
Nodes (0): 

### Community 19 - "Navigation"
Cohesion: 0.5
Nodes (0): 

### Community 20 - "Module 20"
Cohesion: 0.5
Nodes (0): 

### Community 21 - "Module 21"
Cohesion: 0.5
Nodes (0): 

### Community 22 - "Module 22"
Cohesion: 0.67
Nodes (1): NotFound()

### Community 23 - "Module 23"
Cohesion: 0.67
Nodes (1): handleSubmit()

### Community 24 - "Module 24"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Module 25"
Cohesion: 0.67
Nodes (0): 

### Community 26 - "Module 26"
Cohesion: 1.0
Nodes (2): sendTelegramMessage(), sendTelegramMessageAndStore()

### Community 27 - "Module 27"
Cohesion: 0.67
Nodes (3): Claude-Flow Agent Types (coder, planner, researcher, reviewer, tester, analyst, backend-dev, security-auditor, pr-manager), Claude-Flow Cheatsheet (hierarchical-mesh Swarm, 15 Agents), Claude-Flow Skills (sparc-methodology, swarm-orchestration, github-code-review, etc.)

### Community 28 - "Module 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Module 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Module 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Module 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Module 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Module 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Module 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Module 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Module 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Module 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Module 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Module 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Module 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Module 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Module 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Module 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Module 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Module 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Module 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Module 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Module 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Module 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Module 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Module 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Module 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Module 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Module 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Module 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Module 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Module 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Module 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Module 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Module 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Module 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Module 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Module 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Module 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Module 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Module 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Module 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Module 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Module 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Module 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Module 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Module 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Module 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Module 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Module 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Module 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Module 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Module 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Module 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Module 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Module 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Module 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Module 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Module 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Module 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Module 86"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Module 87"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "Module 88"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Module 89"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Module 90"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Module 91"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Module 92"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Module 93"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Module 94"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Module 95"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Module 96"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Module 97"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **31 isolated node(s):** `auth-helpers.ts (assertBoardMemberAccess, assertTeamMemberInOwnTeam)`, `18 App Pages`, `48 API Routes`, `31 Components`, `src/middleware.ts` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Module 28`** (2 nodes): `seed.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 29`** (2 nodes): `main()`, `create-admin.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 30`** (2 nodes): `seed-test-users.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 31`** (2 nodes): `middleware()`, `middleware.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 32`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 33`** (2 nodes): `PrivacyPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 34`** (2 nodes): `DatenschutzPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 35`** (2 nodes): `ProductPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 36`** (2 nodes): `ImpressumPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 37`** (2 nodes): `AgbPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 38`** (2 nodes): `AuthLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 39`** (2 nodes): `DashboardError()`, `error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 40`** (2 nodes): `DashboardLoading()`, `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 41`** (2 nodes): `loadInitialData()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 42`** (2 nodes): `BoardFlowPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 43`** (2 nodes): `AdminBotPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 44`** (2 nodes): `ImprintPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 45`** (2 nodes): `LanguageToggle()`, `LanguageToggle.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 46`** (2 nodes): `Skeleton()`, `skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 47`** (2 nodes): `UserMenu.tsx`, `handleClickOutside()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 48`** (2 nodes): `Footer()`, `Footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 49`** (2 nodes): `getLeadStatus()`, `ConversioLeadCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 50`** (2 nodes): `handleDismiss()`, `EmptyStateCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 51`** (2 nodes): `PipelineBoard()`, `PipelineBoard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 52`** (2 nodes): `handleStateSelect()`, `LeadCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 53`** (2 nodes): `isActive()`, `BoardTabs.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 54`** (2 nodes): `SortableLeadCard()`, `SortableLeadCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 55`** (2 nodes): `templates.tsx`, `DynamicIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 56`** (2 nodes): `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 57`** (2 nodes): `LanguageProvider()`, `LanguageContext.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 58`** (2 nodes): `sendMessage()`, `dispatcher.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 59`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 60`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 61`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 63`** (1 nodes): `database.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 64`** (1 nodes): `auth.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 65`** (1 nodes): `dashboard.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 66`** (1 nodes): `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 67`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 68`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 69`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 70`** (1 nodes): `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 71`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 72`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 73`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 74`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 75`** (1 nodes): `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 76`** (1 nodes): `progress.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 77`** (1 nodes): `toaster.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 78`** (1 nodes): `scroll-area.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 79`** (1 nodes): `avatar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 80`** (1 nodes): `dialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 81`** (1 nodes): `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 82`** (1 nodes): `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 83`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 84`** (1 nodes): `toast.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 85`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 86`** (1 nodes): `ConversioPipeline.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 87`** (1 nodes): `PipelineStage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 88`** (1 nodes): `StateCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 89`** (1 nodes): `BoardNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 90`** (1 nodes): `CRMSkeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 91`** (1 nodes): `BoardSkeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 92`** (1 nodes): `KanbanColumn.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 93`** (1 nodes): `features.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 94`** (1 nodes): `translations.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 95`** (1 nodes): `db.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 96`** (1 nodes): `next-auth.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 97`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `AI Flow Generation` to `Auth & Access Control`, `AI Agent Engine`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `GET()` connect `Auth & Access Control` to `Flow State Management`, `AI Flow Generation`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `runAgentLoop()` connect `AI Agent Engine` to `AI Flow Generation`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `POST()` (e.g. with `processAgentResponse()` and `rateLimit()`) actually correct?**
  _`POST()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `GET()` (e.g. with `assertConversationOwnership()` and `assertBoardMemberAccess()`) actually correct?**
  _`GET()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `toast()` (e.g. with `handleRemove()` and `handleChangeRole()`) actually correct?**
  _`toast()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `PATCH()` (e.g. with `assertTeamMemberInOwnTeam()` and `assertConversationOwnership()`) actually correct?**
  _`PATCH()` has 2 INFERRED edges - model-reasoned connections that need verification._