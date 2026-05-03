-- ============================================================
-- v3_prep: Lead + ChannelInvite Tabellen, Enums, leadId nullable
-- Nur additive Änderungen + Enum-Konvertierungen.
-- KEINE Daten werden gelöscht. Sicher ohne Backfill.
-- ============================================================

-- ----------------------------------------
-- 1. Neue Enums erstellen
-- ----------------------------------------

CREATE TYPE "BoardAdminStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SUSPENDED');
CREATE TYPE "BoardOwnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL');
CREATE TYPE "JobStatus"        AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AlertType"        AS ENUM ('STUCK', 'ERROR', 'MANUAL_INTERVENTION', 'LOOP', 'INFO');
CREATE TYPE "AlertStatus"      AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- ----------------------------------------
-- 2. boards.adminStatus TEXT → BoardAdminStatus
--    Bestehende Werte waren lowercase ('active') aus der alten Migration.
-- ----------------------------------------

UPDATE "boards" SET "adminStatus" = 'ACTIVE'    WHERE lower("adminStatus") IN ('active', '');
UPDATE "boards" SET "adminStatus" = 'PAUSED'    WHERE lower("adminStatus") = 'paused';
UPDATE "boards" SET "adminStatus" = 'SUSPENDED' WHERE lower("adminStatus") = 'suspended';
-- Fallback: alles Unbekannte → ACTIVE
UPDATE "boards" SET "adminStatus" = 'ACTIVE'
  WHERE "adminStatus" NOT IN ('ACTIVE', 'PAUSED', 'SUSPENDED');

ALTER TABLE "boards" ALTER COLUMN "adminStatus" DROP DEFAULT;
ALTER TABLE "boards"
  ALTER COLUMN "adminStatus" TYPE "BoardAdminStatus"
    USING "adminStatus"::"BoardAdminStatus";
ALTER TABLE "boards" ALTER COLUMN "adminStatus" SET DEFAULT 'ACTIVE'::"BoardAdminStatus";

-- ----------------------------------------
-- 3. boards.ownerStatus TEXT → BoardOwnerStatus
-- ----------------------------------------

UPDATE "boards" SET "ownerStatus" = 'ACTIVE'   WHERE lower("ownerStatus") IN ('active', '');
UPDATE "boards" SET "ownerStatus" = 'INACTIVE' WHERE lower("ownerStatus") = 'inactive';
UPDATE "boards" SET "ownerStatus" = 'TRIAL'    WHERE lower("ownerStatus") = 'trial';
UPDATE "boards" SET "ownerStatus" = 'ACTIVE'
  WHERE "ownerStatus" NOT IN ('ACTIVE', 'INACTIVE', 'TRIAL');

ALTER TABLE "boards" ALTER COLUMN "ownerStatus" DROP DEFAULT;
ALTER TABLE "boards"
  ALTER COLUMN "ownerStatus" TYPE "BoardOwnerStatus"
    USING "ownerStatus"::"BoardOwnerStatus";
ALTER TABLE "boards" ALTER COLUMN "ownerStatus" SET DEFAULT 'ACTIVE'::"BoardOwnerStatus";

-- ----------------------------------------
-- 4. jobs.status TEXT → JobStatus
--    Bestehende Werte waren lowercase ('pending', 'running', …).
-- ----------------------------------------

UPDATE "jobs" SET "status" = UPPER("status")
  WHERE "status" IN ('pending', 'running', 'completed', 'failed', 'cancelled');
-- Fallback unbekannte Werte
UPDATE "jobs" SET "status" = 'PENDING'
  WHERE "status" NOT IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

ALTER TABLE "jobs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "jobs"
  ALTER COLUMN "status" TYPE "JobStatus"
    USING "status"::"JobStatus";
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"JobStatus";

-- ----------------------------------------
-- 5. admin_reports: ReportType → AlertType, ReportStatus → AlertStatus
--    Werte sind identisch, nur der Enum-Name ändert sich.
-- ----------------------------------------

ALTER TABLE "admin_reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "admin_reports"
  ALTER COLUMN "type"   TYPE "AlertType"
    USING "type"::TEXT::"AlertType",
  ALTER COLUMN "status" TYPE "AlertStatus"
    USING "status"::TEXT::"AlertStatus";
ALTER TABLE "admin_reports" ALTER COLUMN "status" SET DEFAULT 'OPEN'::"AlertStatus";

-- ----------------------------------------
-- 6. Alte Enums droppen (nicht mehr referenziert)
-- ----------------------------------------

DROP TYPE "ReportType";
DROP TYPE "ReportStatus";

-- ----------------------------------------
-- 7. Neue Tabelle: leads
-- ----------------------------------------

CREATE TABLE "leads" (
    "id"             TEXT        NOT NULL,
    "boardId"        TEXT        NOT NULL,
    "currentStateId" TEXT,
    "assignedToId"   TEXT,
    "name"           TEXT,
    "phone"          TEXT,
    "email"          TEXT,
    "avatar"         TEXT,
    "source"         TEXT        DEFAULT 'manual',
    "channel"        TEXT        DEFAULT 'whatsapp',
    "tags"           TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "leadScore"      INTEGER     NOT NULL DEFAULT 0,
    "stateHistory"   JSONB,
    "customData"     JSONB       NOT NULL DEFAULT '{}',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_boardId_currentStateId_idx" ON "leads"("boardId", "currentStateId");

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_boardId_fkey"
    FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_currentStateId_fkey"
    FOREIGN KEY ("currentStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------
-- 8. Neue Tabelle: lead_memory (ersetzt conversation_memory)
-- ----------------------------------------

CREATE TABLE "lead_memory" (
    "id"        TEXT         NOT NULL,
    "leadId"    TEXT         NOT NULL,
    "key"       TEXT         NOT NULL,
    "value"     TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_memory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_memory_leadId_key_key" ON "lead_memory"("leadId", "key");
CREATE INDEX        "lead_memory_leadId_idx"     ON "lead_memory"("leadId");

ALTER TABLE "lead_memory"
  ADD CONSTRAINT "lead_memory_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------
-- 9. Neue Tabelle: channel_invites
-- ----------------------------------------

CREATE TABLE "channel_invites" (
    "id"         TEXT         NOT NULL,
    "boardId"    TEXT         NOT NULL,
    "platform"   TEXT         NOT NULL,
    "inviteCode" TEXT         NOT NULL,
    "expiresAt"  TIMESTAMP(3),
    "usageCount" INTEGER      NOT NULL DEFAULT 0,
    "maxUsage"   INTEGER,
    "isActive"   BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "channel_invites_inviteCode_key" ON "channel_invites"("inviteCode");

ALTER TABLE "channel_invites"
  ADD CONSTRAINT "channel_invites_boardId_fkey"
    FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------
-- 10. leadId (nullable) an conversations anhängen
-- ----------------------------------------

ALTER TABLE "conversations" ADD COLUMN "leadId" TEXT;

CREATE INDEX "conversations_leadId_idx" ON "conversations"("leadId");
