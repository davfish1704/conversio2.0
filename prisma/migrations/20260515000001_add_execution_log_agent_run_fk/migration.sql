-- Add agentRunId FK to execution_logs for linking tool executions to their parent AgentRun.

ALTER TABLE "execution_logs"
ADD COLUMN "agentRunId" TEXT;

CREATE INDEX IF NOT EXISTS "execution_logs_agentRunId_idx" ON "execution_logs"("agentRunId");

ALTER TABLE "execution_logs"
ADD CONSTRAINT "execution_logs_agentRunId_fkey"
FOREIGN KEY ("agentRunId")
REFERENCES "agent_runs"("id")
ON DELETE SET NULL;
