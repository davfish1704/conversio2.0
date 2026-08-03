-- Closes schema drift between prisma/schema.prisma and migration history.
-- These objects were previously applied to the old Neon DB via `db push` and
-- never got migration SQL. Generated via:
--   npx prisma migrate diff --from-migrations prisma/migrations \
--     --to-schema-datamodel prisma/schema.prisma --shadow-database-url <empty db> --script
--
-- NOTE: the raw diff also proposed DROP INDEX on "assets_embedding_hnsw_idx" and
-- "brain_documents_embedding_hnsw_idx". That is a diff-engine artifact, not real
-- drift: Prisma's schema language cannot represent HNSW/custom-opclass indexes
-- (Unsupported("vector(1536)") columns), so it sees them as absent from the
-- datamodel and wants to drop them. Both statements were removed here on purpose
-- -- dropping them would regress semantic search, which is out of scope for a
-- drift-closing migration. They remain exactly as created in
-- 20260716000000_add_vector_embeddings.
--
-- No `CREATE EXTENSION IF NOT EXISTS vector;` is needed here: it already exists
-- in 20260716000000_add_vector_embeddings, which runs before this migration.

-- CreateEnum
CREATE TYPE "AdminChannel" AS ENUM ('TELEGRAM', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "SupervisorTriggerType" AS ENUM ('AGENT_STUCK', 'HANDOFF_REPEATEDLY_BLOCKED', 'TOOL_FAILURE_PATTERN', 'NO_LEAD_REPLY_TIMEOUT', 'ESCALATION_REQUESTED', 'PERIODIC_AUDIT_FINDING', 'ON_DEMAND_QUERY');

-- CreateEnum
CREATE TYPE "SupervisorActionType" AS ENUM ('RESET_STATE', 'REASSIGN_TO_STATE', 'PAUSE_LEAD', 'RESUME_LEAD', 'FORCE_HANDOFF', 'NOTIFY_ONLY', 'KILL_CONVERSATION', 'UPDATE_LEAD_SCORE', 'REQUEST_HUMAN_TAKEOVER');

-- CreateEnum
CREATE TYPE "SupervisorUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_ADMIN', 'APPROVED', 'REJECTED', 'AUTO_APPROVED', 'EXECUTED', 'FAILED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "execution_logs" DROP CONSTRAINT "execution_logs_agentRunId_fkey";

-- AlterTable
ALTER TABLE "admin_notifications" ADD COLUMN     "channel" "AdminChannel",
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "supervisorActionId" TEXT;

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "extractedText" TEXT;

-- AlterTable
ALTER TABLE "states" ADD COLUMN     "autoApproveActions" "SupervisorActionType"[] DEFAULT ARRAY[]::"SupervisorActionType"[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminChannel" "AdminChannel" NOT NULL DEFAULT 'TELEGRAM',
ADD COLUMN     "adminTelegramChatId" TEXT,
ADD COLUMN     "adminWhatsappNumber" TEXT,
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "supervisor_actions" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "leadId" TEXT,
    "conversationId" TEXT,
    "triggerType" "SupervisorTriggerType" NOT NULL,
    "triggerContext" JSONB NOT NULL DEFAULT '{}',
    "proposedAction" "SupervisorActionType" NOT NULL,
    "actionParams" JSONB NOT NULL DEFAULT '{}',
    "reasoning" TEXT NOT NULL,
    "urgency" "SupervisorUrgency" NOT NULL DEFAULT 'NORMAL',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
    "notificationSentAt" TIMESTAMP(3),
    "notificationChannel" "AdminChannel",
    "notificationMessageId" TEXT,
    "approverUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "executedAt" TIMESTAMP(3),
    "executionResult" JSONB,
    "executionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisor_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supervisor_actions_status_createdAt_idx" ON "supervisor_actions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "supervisor_actions_boardId_createdAt_idx" ON "supervisor_actions"("boardId", "createdAt");

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_supervisorActionId_fkey" FOREIGN KEY ("supervisorActionId") REFERENCES "supervisor_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_actions" ADD CONSTRAINT "supervisor_actions_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_actions" ADD CONSTRAINT "supervisor_actions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_actions" ADD CONSTRAINT "supervisor_actions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_actions" ADD CONSTRAINT "supervisor_actions_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
