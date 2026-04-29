# Conversio2.0 — Projekt-Kontext für Claude Code

## Was das ist
Deutschsprachiges AI-CRM für DACH-Versicherungsmakler. Pre-Launch.
Schwesterprodukt: Alkaio (WhatsApp Lead-Automation).

## Stack
- Next.js 14 App Router + TypeScript + Prisma + Tailwind + shadcn/ui
- Postgres auf Supabase, Deploy auf Vercel
- AI: Kimi (primary), Groq, Ollama Fallback
- Messaging: Meta WhatsApp Business API

## Konventionen — NICHT "fixen"
- Alle User-facing Strings sind auf Deutsch. Nicht ins Englische uebersetzen.
- Kommentare duerfen DE oder EN sein, beides okay.
- Waehrung = EUR, Datum = TT.MM.JJJJ, Dezimaltrenner = Komma.
- Server Components als Default. "use client" nur wenn noetig.
- Prisma Client wird aus @/lib/prisma importiert, nie inline instanziiert.

## Default-Verhalten in diesem Repo
- READ-ONLY by default. Nicht editieren ohne explizites "fix it" oder "apply".
- Niemals npm install, prisma migrate, oder andere mutierende Commands ohne Nachfrage.
- Niemals committen oder pushen. Das mache ich.
- Working Tree ist aktuell dirty mit WIP-Aenderungen. Audit die Dateien auf der Platte, nicht HEAD.
- Bei build/typecheck: Full Output nach /tmp/ schreiben, nicht mit head/tail abschneiden.

## Critical Paths die immer funktionieren muessen
1. Register → Login → Dashboard
2. Lead anlegen → Board → Stage draggen → persistiert nach Reload
3. AI Chat (BrainLab) Send/Receive
4. WhatsApp Webhook empfangen + Outbound senden
5. Auth-Boundary auf /dashboard und /api/*

## Bekannte historische Pain Points
- middleware.ts (Auth + DELETE Method)
- KIMI_API_KEY Env-Naming
- Prisma Schema Drift
- Fehlende shadcn Components (zuletzt scroll-area)

## Context Navigation
1. ALWAYS query the knowledge graph first: `/graphify query "your question"`
2. Only read raw files if I explicitly say "read the file" or "look at the raw file"
3. Use `graphify-out/wiki/index.md` as your navigation entrypoint for browsing structure

## Wo Sachen liegen
- API Routes: src/app/api/
- Auth Routes: src/app/(auth)/
- Dashboard: src/app/(dashboard)/
- Boards: src/app/(dashboard)/boards/[id]/
- CRM: src/app/(dashboard)/crm/
- WhatsApp: src/app/(dashboard)/whatsapp/
- Components: src/components/
- Prisma: prisma/schema.prisma
