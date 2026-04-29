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
CREATE TABLE "stage_transitions" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "fromStateId" TEXT NOT NULL,
    "toStateId" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "triggerConfig" JSONB,
    "actionType" TEXT,
    "actionConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brain_documents_boardId_category_idx" ON "brain_documents"("boardId", "category");

-- CreateIndex
CREATE INDEX "brain_faqs_boardId_category_idx" ON "brain_faqs"("boardId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "stage_transitions_fromStateId_toStateId_key" ON "stage_transitions"("fromStateId", "toStateId");

-- AddForeignKey
ALTER TABLE "brain_documents" ADD CONSTRAINT "brain_documents_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_rules" ADD CONSTRAINT "brain_rules_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_faqs" ADD CONSTRAINT "brain_faqs_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_fromStateId_fkey" FOREIGN KEY ("fromStateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_toStateId_fkey" FOREIGN KEY ("toStateId") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
