-- Remove legacy mission field from states table.
-- The mission field was superseded by agentGoal + agentSystemPrompt (sub-agent fields).
-- rules field is kept for CONDITION-state routing logic (parsed by state-machine.ts).

ALTER TABLE "states" DROP COLUMN IF EXISTS "mission";
