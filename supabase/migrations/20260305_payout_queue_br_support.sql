-- M2: Allow payout_queue to serve Battle Royale payouts
-- Currently match_id is NOT NULL — we need to support BR payouts where match_id is null

ALTER TABLE payout_queue ALTER COLUMN match_id DROP NOT NULL;

ALTER TABLE payout_queue ADD COLUMN IF NOT EXISTS battle_royale_id UUID REFERENCES battle_royales(id);

-- Ensure every payout references either a match or a battle royale
ALTER TABLE payout_queue ADD CONSTRAINT payout_queue_source_check
  CHECK (match_id IS NOT NULL OR battle_royale_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_payout_queue_br_id ON payout_queue (battle_royale_id)
  WHERE battle_royale_id IS NOT NULL;
