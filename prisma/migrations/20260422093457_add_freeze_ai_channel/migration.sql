-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aiModel" TEXT DEFAULT 'llama-3.1-8b-instant',
ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'whatsapp',
ADD COLUMN     "frozen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "frozenBy" TEXT,
ADD COLUMN     "frozenReason" TEXT;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false;
