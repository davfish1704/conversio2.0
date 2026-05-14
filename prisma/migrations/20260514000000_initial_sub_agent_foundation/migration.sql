-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'AGENT');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "BoardAdminStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BoardOwnerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL');

-- CreateEnum
CREATE TYPE "BoardRole" AS ENUM ('ADMIN', 'AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "StateType" AS ENUM ('AI', 'MESSAGE', 'TEMPLATE', 'CONDITION', 'WAIT');

-- CreateEnum
CREATE TYPE "HandoffMode" AS ENUM ('LLM_ONLY', 'RULE_ONLY', 'HYBRID');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'SPAM');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'TEMPLATE', 'LOCATION');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentRunOutcome" AS ENUM ('SUCCESS_CONTINUE', 'SUCCESS_HANDOFF', 'HANDOFF_BLOCKED', 'TOOL_EXECUTION_FAILED', 'LLM_ERROR', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ChannelInviteStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InviteSource" AS ENUM ('LEAD_REINVITE', 'BOARD_ACQUISITION');

-- CreateEnum
CREATE TYPE "BrainAssetType" AS ENUM ('AUDIO_MEMO', 'PDF_DOC', 'IMAGE_ASSET', 'TEXT_SNIPPET', 'TEMPLATE', 'KNOWLEDGE_BASE');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'PDF', 'AUDIO', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('STUCK', 'ERROR', 'MANUAL_INTERVENTION', 'LOOP', 'INFO');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('SUCCESS', 'ERROR', 'STUCK', 'WAITING_USER', 'MANUAL_INTERVENTION', 'LOOP');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DEAD');

-- CreateEnum
CREATE TYPE "NotificationLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "google_id" TEXT,
    "image" TEXT,
    "password" TEXT,
    "email_verified" TIMESTAMP(3),
    "verify_token" TEXT,
    "verify_token_expiry" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "timezone" TEXT DEFAULT 'Europe/Berlin',
    "language" TEXT DEFAULT 'de',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "adminStatus" "BoardAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerStatus" "BoardOwnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "behaviorMode" TEXT NOT NULL DEFAULT 'reactive',
    "boardCustomFields" JSONB NOT NULL DEFAULT '[]',
    "contextWindowSize" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_members" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'AGENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StateType" NOT NULL DEFAULT 'MESSAGE',
    "mission" TEXT,
    "rules" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoTransition" BOOLEAN NOT NULL DEFAULT false,
    "nextStateId" TEXT,
    "config" JSONB,
    "fieldDefinitions" JSONB,
    "behaviorMode" TEXT,
    "dataToCollect" JSONB NOT NULL DEFAULT '[]',
    "completionRule" TEXT,
    "availableTools" JSONB NOT NULL DEFAULT '[]',
    "escalateOnNoReply" INTEGER,
    "escalateOnLowConfidence" BOOLEAN NOT NULL DEFAULT true,
    "escalateOnOffMission" BOOLEAN NOT NULL DEFAULT true,
    "maxFollowups" INTEGER NOT NULL DEFAULT 3,
    "followupAction" TEXT NOT NULL DEFAULT 'escalate',
    "followupTargetState" TEXT,
    "allowChannelSwitch" BOOLEAN NOT NULL DEFAULT true,
    "agentRole" TEXT,
    "agentSystemPrompt" TEXT,
    "agentGoal" TEXT,
    "handoffMode" "HandoffMode" NOT NULL DEFAULT 'HYBRID',
    "handoffRules" JSONB NOT NULL DEFAULT '[]',
    "minAgentConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "nextStateOnFail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "currentStateId" TEXT,
    "assignedToId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "source" TEXT DEFAULT 'manual',
    "channel" TEXT DEFAULT 'whatsapp',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "stateHistory" JSONB,
    "stageMovedAt" TIMESTAMP(3),
    "stageMovedBy" TEXT,
    "customData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "currentStateId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "externalId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" TIMESTAMP(3),
    "frozenReason" TEXT,
    "frozenBy" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "followupCount" INTEGER NOT NULL DEFAULT 0,
    "conversationSummary" TEXT,
    "summaryUpdatedAt" TIMESTAMP(3),
    "messageCountSinceSum" INTEGER NOT NULL DEFAULT 0,
    "customData" JSONB NOT NULL DEFAULT '{}',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "direction" "Direction" NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "messageType" "MessageType" NOT NULL DEFAULT 'TEXT',
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "systemPromptUsed" TEXT NOT NULL,
    "userMessageInput" TEXT NOT NULL,
    "contextMessages" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "agentResponse" TEXT,
    "toolCallsMade" JSONB NOT NULL DEFAULT '[]',
    "handoffProposed" BOOLEAN NOT NULL DEFAULT false,
    "handoffReason" TEXT,
    "agentConfidence" DOUBLE PRECISION,
    "rulesPassed" BOOLEAN,
    "ruleEvaluation" JSONB,
    "targetStateId" TEXT,
    "outcome" "AgentRunOutcome" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_memory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_channels" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "telegramBotToken" TEXT,
    "telegramBotUsername" TEXT,
    "telegramWebhookSecret" TEXT,
    "waPhoneNumberId" TEXT,
    "waAccessToken" TEXT,
    "waBusinessAccountId" TEXT,
    "waVerifyToken" TEXT,
    "webhookSecret" TEXT,
    "igPageId" TEXT,
    "igAccessToken" TEXT,
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_invites" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "leadId" TEXT,
    "source" "InviteSource" NOT NULL DEFAULT 'LEAD_REINVITE',
    "campaign" TEXT,
    "targetChannelId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ChannelInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "consumedConversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_brains" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "stylePrompt" TEXT NOT NULL,
    "infoPrompt" TEXT NOT NULL,
    "rulePrompt" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "language" TEXT NOT NULL DEFAULT 'de',
    "tone" TEXT NOT NULL DEFAULT 'friendly',
    "channelSwitchTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_brains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_assets" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "type" "BrainAssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssetType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "r2Key" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_states" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_documents" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_rules" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_faqs" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_reports" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "stateId" TEXT,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "admin_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stateId" TEXT,
    "action" TEXT NOT NULL,
    "input" TEXT,
    "output" TEXT,
    "context" JSONB,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "stuckDuration" INTEGER,
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "defaultProvider" TEXT NOT NULL DEFAULT 'groq',
    "defaultModel" TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
    "fallbackProvider" TEXT,
    "fallbackModel" TEXT,
    "modelOverrides" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_api_keys" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyBudgetCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
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

-- CreateTable
CREATE TABLE "failed_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "lastError" TEXT,
    "attempts" INTEGER NOT NULL,
    "boardId" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "conversationId" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'unknown',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "providerCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "boardId" TEXT,
    "leadId" TEXT,
    "level" "NotificationLevel" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "telegramSent" BOOLEAN NOT NULL DEFAULT false,
    "telegramMessageId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhooks" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_verify_token_key" ON "users"("verify_token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "board_members_boardId_userId_key" ON "board_members"("boardId", "userId");

-- CreateIndex
CREATE INDEX "leads_boardId_currentStateId_idx" ON "leads"("boardId", "currentStateId");

-- CreateIndex
CREATE INDEX "conversations_leadId_lastMessageAt_idx" ON "conversations"("leadId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_boardId_status_lastMessageAt_idx" ON "conversations"("boardId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_timestamp_idx" ON "messages"("conversationId", "timestamp");

-- CreateIndex
CREATE INDEX "agent_runs_conversationId_createdAt_idx" ON "agent_runs"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_boardId_createdAt_idx" ON "agent_runs"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "agent_runs_leadId_createdAt_idx" ON "agent_runs"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_memory_leadId_idx" ON "lead_memory"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_memory_leadId_key_key" ON "lead_memory"("leadId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "board_channels_boardId_platform_key" ON "board_channels"("boardId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "channel_invites_token_key" ON "channel_invites"("token");

-- CreateIndex
CREATE INDEX "channel_invites_token_idx" ON "channel_invites"("token");

-- CreateIndex
CREATE INDEX "channel_invites_leadId_createdAt_idx" ON "channel_invites"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "board_brains_boardId_key" ON "board_brains"("boardId");

-- CreateIndex
CREATE INDEX "board_assets_boardId_type_idx" ON "board_assets"("boardId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "assets_r2Key_key" ON "assets"("r2Key");

-- CreateIndex
CREATE INDEX "assets_boardId_idx" ON "assets"("boardId");

-- CreateIndex
CREATE INDEX "assets_boardId_type_idx" ON "assets"("boardId", "type");

-- CreateIndex
CREATE INDEX "assets_tags_idx" ON "assets" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "asset_states_stateId_idx" ON "asset_states"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_states_assetId_stateId_key" ON "asset_states"("assetId", "stateId");

-- CreateIndex
CREATE INDEX "brain_documents_boardId_category_idx" ON "brain_documents"("boardId", "category");

-- CreateIndex
CREATE INDEX "brain_faqs_boardId_category_idx" ON "brain_faqs"("boardId", "category");

-- CreateIndex
CREATE INDEX "execution_logs_boardId_status_createdAt_idx" ON "execution_logs"("boardId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_configs_boardId_key" ON "ai_provider_configs"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_api_keys_provider_key" ON "platform_api_keys"("provider");

-- CreateIndex
CREATE INDEX "jobs_status_scheduledFor_idx" ON "jobs"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "jobs_leadId_idx" ON "jobs"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "failed_jobs_jobId_key" ON "failed_jobs"("jobId");

-- CreateIndex
CREATE INDEX "usage_logs_boardId_createdAt_idx" ON "usage_logs"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "usage_logs_model_createdAt_idx" ON "usage_logs"("model", "createdAt");

-- CreateIndex
CREATE INDEX "admin_notifications_level_createdAt_idx" ON "admin_notifications"("level", "createdAt");

-- CreateIndex
CREATE INDEX "admin_notifications_boardId_createdAt_idx" ON "admin_notifications"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "processed_webhooks_processedAt_idx" ON "processed_webhooks"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhooks_externalId_channel_boardId_key" ON "processed_webhooks"("externalId", "channel", "boardId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_currentStateId_fkey" FOREIGN KEY ("currentStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_currentStateId_fkey" FOREIGN KEY ("currentStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_memory" ADD CONSTRAINT "lead_memory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_channels" ADD CONSTRAINT "board_channels_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_targetChannelId_fkey" FOREIGN KEY ("targetChannelId") REFERENCES "board_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_brains" ADD CONSTRAINT "board_brains_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_assets" ADD CONSTRAINT "board_assets_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_states" ADD CONSTRAINT "asset_states_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_states" ADD CONSTRAINT "asset_states_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_documents" ADD CONSTRAINT "brain_documents_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_rules" ADD CONSTRAINT "brain_rules_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_faqs" ADD CONSTRAINT "brain_faqs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_reports" ADD CONSTRAINT "admin_reports_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

