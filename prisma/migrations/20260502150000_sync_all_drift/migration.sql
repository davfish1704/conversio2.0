-- CreateEnum
CREATE TYPE "ChannelInviteStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED');

-- DropIndex
DROP INDEX "channel_invites_inviteCode_key";

-- DropIndex
DROP INDEX "conversations_leadId_idx";

-- AlterTable
ALTER TABLE "board_brains" ADD COLUMN     "channelSwitchTemplate" TEXT;

-- AlterTable
ALTER TABLE "channel_invites" DROP COLUMN "inviteCode",
DROP COLUMN "isActive",
DROP COLUMN "maxUsage",
DROP COLUMN "platform",
DROP COLUMN "usageCount",
ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "consumedConversationId" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "leadId" TEXT NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "status" "ChannelInviteStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "targetChannelId" TEXT NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL,
ALTER COLUMN "expiresAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "language" SET DEFAULT 'de';

-- CreateIndex
CREATE UNIQUE INDEX "channel_invites_token_key" ON "channel_invites"("token");

-- CreateIndex
CREATE INDEX "channel_invites_token_idx" ON "channel_invites"("token");

-- CreateIndex
CREATE INDEX "channel_invites_leadId_createdAt_idx" ON "channel_invites"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "conversations_leadId_lastMessageAt_idx" ON "conversations"("leadId", "lastMessageAt");

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_targetChannelId_fkey" FOREIGN KEY ("targetChannelId") REFERENCES "board_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

