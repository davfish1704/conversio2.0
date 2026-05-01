-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "adminStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "behaviorMode" TEXT NOT NULL DEFAULT 'reactive',
ADD COLUMN     "boardCustomFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "ownerStatus" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "collectedFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "customData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "externalId" TEXT,
ALTER COLUMN "waAccountId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "states" ADD COLUMN     "behaviorMode" TEXT,
ADD COLUMN     "completionRule" TEXT,
ADD COLUMN     "dataToCollect" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "escalateOnLowConfidence" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "escalateOnNoReply" INTEGER,
ADD COLUMN     "escalateOnOffMission" BOOLEAN NOT NULL DEFAULT true;

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
    "igPageId" TEXT,
    "igAccessToken" TEXT,
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_channels_boardId_platform_key" ON "board_channels"("boardId", "platform");

-- AddForeignKey
ALTER TABLE "board_channels" ADD CONSTRAINT "board_channels_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
