-- AlterTable
ALTER TABLE "users" ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "timezone" TEXT DEFAULT 'Europe/Berlin';
