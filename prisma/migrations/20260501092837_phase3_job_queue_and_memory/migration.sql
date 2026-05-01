-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "contextWindowSize" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "conversationSummary" TEXT,
ADD COLUMN     "followupCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messageCountSinceSum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summaryUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "states" ADD COLUMN     "availableTools" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "followupAction" TEXT NOT NULL DEFAULT 'escalate',
ADD COLUMN     "followupTargetState" TEXT,
ADD COLUMN     "maxFollowups" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "tool_call_logs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stateId" TEXT,
    "toolName" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "leadId" TEXT,
    "boardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_call_logs_conversationId_createdAt_idx" ON "tool_call_logs"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "tool_call_logs_toolName_idx" ON "tool_call_logs"("toolName");

-- CreateIndex
CREATE INDEX "jobs_status_scheduledFor_idx" ON "jobs"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "jobs_leadId_idx" ON "jobs"("leadId");
