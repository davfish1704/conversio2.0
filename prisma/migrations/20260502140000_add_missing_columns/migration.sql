ALTER TABLE "states"
  ADD COLUMN IF NOT EXISTS "allowChannelSwitch" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "board_channels"
  ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;
