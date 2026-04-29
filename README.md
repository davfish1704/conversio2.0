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

## 🎯 Next Steps (Baustein 2: Auth)

- Google OAuth mit Supabase Auth implementieren
- Login/Register Flows
- Middleware für geschützte Routen
- Session-Management mit `@supabase/ssr`

---

**Repository:** https://github.com/tobroe/conversio-corp-v2
