# Conversio Corp v2.0 - Baustein 1: Datenbank-Fundament

Dieses Projekt enthält das vollständige Datenbank-Schema für Conversio Corp v2.0, basierend auf Prisma ORM und Supabase PostgreSQL.

## 🚀 Setup

```bash
# 1. Dependencies installieren
npm install

# 2. Prisma Client generieren
npx prisma generate

# 3. Datenbank-Schema deployen (Initial-Setup)
npx prisma db push --accept-data-loss

# 4. Testdaten seeden
npx ts-node prisma/seed.ts

# 5. Tests ausführen
npm run test:db
```

## 🔐 Umgebungsvariablen

Kopiere `.env.example` zu `.env.local` und fülle die Werte aus:

```bash
cp .env.example .env.local
```

### Wichtige Sicherheitshinweise:

- **`DATABASE_URL`**: Server-only. Enthält das Datenbank-Passwort. Niemals im Frontend verwenden.
- **`NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Öffentlich. Für Client-Komponenten und Browser-Client.
- **`SUPABASE_SERVICE_ROLE_KEY`**: 🔴 **STRENG VERTRAULICH!** Server-only. Umgeht RLS (Row Level Security). Niemals an das Frontend weitergeben!

## 📁 Projektstruktur

```
conversio2.0/
├── prisma/
│   ├── schema.prisma          # Komplettes Schema mit 8 Tabellen
│   └── seed.ts                # Realistische deutsche Testdaten
├── src/
│   └── lib/
│       ├── db.ts              # Prisma + Supabase Clients
│       └── types/             # TypeScript Interfaces
├── tests/
│   └── database.test.ts       # Vitest: CRUD, Relations, Constraints
├── .env.local                 # Lokale Umgebungsvariablen (nicht im Git!)
├── .env.example               # Dokumentation der benötigten Variablen
└── ...
```

## 🧪 Test-Befehl

```bash
npm run test:db
```

Die Tests decken ab:
- **CRUD**: User erstellen, lesen, aktualisieren
- **Relations**: Team → WhatsAppAccount → Conversation → Message
- **Cascades**: Löschverhalten bei Team- und User-Löschung
- **Constraints**: Unique Violations, Required Fields

## 🛠 Nützliche Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run db:generate` | Prisma Client generieren |
| `npm run db:push` | Schema zur Datenbank pushen |
| `npm run db:seed` | Testdaten in die DB einspielen |
| `npm run test:db` | Vitest-Datenbank-Tests ausführen |

## 📝 Datenbank-Schema (8 Tabellen)

1. **users** - Nutzer (mit Google OAuth Support)
2. **teams** - Unternehmen/Teams
3. **team_members** - Team-Mitgliedschaften mit Rollen
4. **whatsapp_accounts** - Verknüpfte WhatsApp Business Accounts
5. **conversations** - Kundenkonversationen
6. **messages** - Einzelnachrichten (INBOUND/OUTBOUND)
7. **workflows** - Automatisierungs-Workflows
8. **api_tokens** - Verschlüsselte API-Token für Integrationen

## 🤖 Supervisor Agent

Der Supervisor Agent überwacht automatisch alle Sub-Agent Runs, erkennt Probleme und benachrichtigt Admins via Telegram.

### Trigger Rules (Detection Engine)

| Rule | Beschreibung | Schwelle | Vorgeschlagene Aktion |
|------|-------------|----------|----------------------|
| `loop_on_state` | ≥4 aufeinanderfolgende Runs im selben State ohne Handoff | 4 runs | `FORCE_HANDOFF` |
| `repeated_tool_failure` | ≥3 aufeinanderfolgende Tool-Execution-Fehler | 3 runs | `RESET_STATE` |
| `low_confidence_handoff` | Handoff mit Confidence < 0.5 | < 50% | `REQUEST_HUMAN_TAKEOVER` |
| `cost_spike` | Lead-Kosten > 5x Board-Durchschnitt | 5x avg | `NOTIFY_ONLY` |
| `stuck_lead` | Kein AgentRun > 12h bei aktivem Lead | 12h | `NOTIFY_ONLY` |

### Cron Jobs

Läuft nicht mehr über Vercel Cron — siehe [Worker](#worker-job-runner--supervisor-timer) unten.
Die HTTP-Routen (`/api/cron/supervisor-scan`, `/api/cron/supervisor-audit`, `/api/cron/process-jobs`,
`/api/cron/check-stuck-leads`) existieren weiter als Rückweg, sind aber standardmäßig deaktiviert
(`CRON_ROUTES_ENABLED`, s.u.).

### Telegram Callback Handler

Admins können Supervisor-Aktionen direkt per Telegram Inline Keyboard genehmigen, ablehnen oder schlummern:

- `POST /api/telegram/admin-callback` — Verarbeitet Callback-Queries
- Callback-Format: `supervisor:{approve|reject|snooze}:{actionId}`
- Nach Genehmigung: `supervisor_execute` Job wird enqueued
- Nach Schlummern: 1h Cooldown, Scan ignoriert die Detection

### Neue Environment Variables

```
ADMIN_ALLOWED_TELEGRAM_IDS="123456789,987654321"
CRON_SECRET="openssl rand -hex 32"
```

### Synthetic Test

```bash
npx tsx scripts/test-supervisor-scan.ts
```

## ⚙️ Worker (Job Runner + Supervisor Timer)

Ersetzt Vercel Cron auf dem VPS/Coolify-Deployment: ein einziger Node-Prozess pollt die
Job-Queue und fährt die Supervisor-Timer selbst, statt über HTTP-Cron-Routen.

**WICHTIG — GENAU EIN Prozess.** Der Conversation-Lock in `src/lib/jobs/runner.ts`
(`acquireConversationLock`) ist eine prozesslokale In-Memory-Map, nicht verteilt. Zwei
gleichzeitig laufende Worker-Instanzen (oder Replicas > 1) können denselben Conversation
gleichzeitig verarbeiten — der Lock schützt nicht über Prozessgrenzen hinweg. Als Coolify-
Resource mit **Replicas = 1** deployen, nicht horizontal skalieren.

Start-Kommando:
```bash
npm run worker
```

### Environment Variables

```
WORKER_POLL_MS=3000                # Job-Runner Poll-Intervall (Default 3s)
WORKER_SUPERVISOR_SCAN_MS=300000   # Supervisor-Scan-Intervall (Default 5 Min)
WORKER_SUPERVISOR_AUDIT_MS=14400000  # Supervisor-Audit-Intervall (Default 4h)
WORKER_STUCK_LEADS_MS=600000       # Stuck-Lead-Check-Intervall (Default 10 Min)
CRON_ROUTES_ENABLED=false          # HTTP-Cron-Routen als Rückweg (Default aus → 204 ohne Arbeit)
```

## 🎯 Next Steps (Baustein 2: Auth)

- Google OAuth mit Supabase Auth implementieren
- Login/Register Flows
- Middleware für geschützte Routen
- Session-Management mit `@supabase/ssr`

---

**Repository:** https://github.com/tobroe/conversio-corp-v2
