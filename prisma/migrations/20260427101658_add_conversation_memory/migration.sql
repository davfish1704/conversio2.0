-- CreateTable
CREATE TABLE "conversation_memory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_memory_conversationId_idx" ON "conversation_memory"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_memory_conversationId_key_key" ON "conversation_memory"("conversationId", "key");

-- AddForeignKey
ALTER TABLE "conversation_memory" ADD CONSTRAINT "conversation_memory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
