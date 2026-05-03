-- CreateEnum
CREATE TYPE "InviteSource" AS ENUM ('LEAD_REINVITE', 'BOARD_ACQUISITION');

-- AlterTable: make leadId nullable, add source + campaign
ALTER TABLE "channel_invites" ALTER COLUMN "lead_id" DROP NOT NULL;
ALTER TABLE "channel_invites" ADD COLUMN "source" "InviteSource" NOT NULL DEFAULT 'LEAD_REINVITE';
ALTER TABLE "channel_invites" ADD COLUMN "campaign" TEXT;
