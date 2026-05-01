-- ============================================================
-- v3_finalize: leadId NOT NULL, alte Tabellen/Felder droppen
-- NUR ausführen NACHDEM backfill-leads-v3.ts erfolgreich war
-- und "Unlinked conversations: 0" gemeldet hat.
-- ============================================================

-- ----------------------------------------
-- 1. conversations.boardId aus Lead ableiten wo null
--    (Sicherheitsnetz für Conversations die boardId verloren haben)
-- ----------------------------------------

UPDATE "conversations" c
SET    "boardId" = l."boardId"
FROM   "leads" l
WHERE  c."leadId" = l."id"
  AND  c."boardId" IS NULL;

-- ----------------------------------------
-- 2. Waisenkind-Conversations bereinigen (kein leadId → kein boardId)
--    Erst abhängige Datensätze löschen (kein CASCADE auf execution_logs)
-- ----------------------------------------

DELETE FROM "execution_logs"
WHERE "conversationId" IN (
    SELECT "id" FROM "conversations" WHERE "leadId" IS NULL
);

DELETE FROM "conversations" WHERE "leadId" IS NULL;

-- ----------------------------------------
-- 3. conversations.leadId: nullable → NOT NULL + FK
-- ----------------------------------------

ALTER TABLE "conversations"
  ALTER COLUMN "leadId" SET NOT NULL;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------
-- 4. conversations.boardId: nullable → NOT NULL
--    (alle Zeilen haben jetzt boardId durch Schritt 1 + Cleanup)
-- ----------------------------------------

ALTER TABLE "conversations"
  ALTER COLUMN "boardId" SET NOT NULL;

-- ----------------------------------------
-- 5. Veraltete Spalten von conversations droppen
--    (Daten stehen jetzt auf leads)
-- ----------------------------------------

ALTER TABLE "conversations"
  DROP COLUMN IF EXISTS "waAccountId",
  DROP COLUMN IF EXISTS "customerPhone",
  DROP COLUMN IF EXISTS "customerName",
  DROP COLUMN IF EXISTS "customerAvatar",
  DROP COLUMN IF EXISTS "source",
  DROP COLUMN IF EXISTS "tags",
  DROP COLUMN IF EXISTS "leadScore",
  DROP COLUMN IF EXISTS "stateHistory",
  DROP COLUMN IF EXISTS "customFields",
  DROP COLUMN IF EXISTS "collectedFields",
  DROP COLUMN IF EXISTS "aiModel";

-- ----------------------------------------
-- 6. Veraltete Tabellen droppen
-- ----------------------------------------

-- conversation_memory: Daten sind in lead_memory
DROP TABLE IF EXISTS "conversation_memory";

-- admin_notifications: durch AdminReport ersetzt
DROP TABLE IF EXISTS "admin_notifications";

-- tool_call_logs: nicht mehr Teil des Schemas
DROP TABLE IF EXISTS "tool_call_logs";

-- stage_transitions: nicht mehr Teil des Schemas
DROP TABLE IF EXISTS "stage_transitions";

-- workflows: nicht mehr Teil des Schemas
DROP TABLE IF EXISTS "workflows";

-- api_tokens: nicht mehr Teil des Schemas
DROP TABLE IF EXISTS "api_tokens";

-- whatsapp_accounts: durch BoardChannel ersetzt
--   Erst FK von conversations entfernen (falls noch vorhanden)
ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_waAccountId_fkey";

DROP TABLE IF EXISTS "whatsapp_accounts";

-- ----------------------------------------
-- 7. Veraltete Enums droppen
-- ----------------------------------------

DROP TYPE IF EXISTS "WhatsAppStatus";
