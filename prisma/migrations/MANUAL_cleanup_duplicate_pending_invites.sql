-- Expire duplicate PENDING invites, keeping the oldest per (leadId, targetChannelId, source, campaign).
-- Safe to run multiple times (idempotent).
UPDATE channel_invites
SET status = 'EXPIRED'
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY "leadId", "targetChannelId", source, campaign
        ORDER BY "createdAt" ASC
      ) AS rn
    FROM channel_invites
    WHERE status = 'PENDING'
  ) duplicates
  WHERE rn > 1
);
