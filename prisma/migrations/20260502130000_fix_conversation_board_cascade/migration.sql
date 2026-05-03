-- Fix conversations_boardId_fkey: SET NULL → CASCADE
-- The original 0_init migration created this FK as ON DELETE SET NULL.
-- v3_finalize later made boardId NOT NULL without updating the FK action,
-- causing P2011 "Null constraint violation" when deleting a board.

ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_boardId_fkey";

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_boardId_fkey"
    FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
