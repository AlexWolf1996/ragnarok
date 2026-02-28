-- Task 02: Payout Queue for sequential processing
-- Prevents race conditions when multiple payouts try to send from the same treasury wallet

CREATE TABLE IF NOT EXISTS payout_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id),
  wallet_address text NOT NULL,
  amount_sol numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  tx_signature text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Partial index for fast pending-item lookup
CREATE INDEX idx_payout_queue_pending ON payout_queue (created_at)
  WHERE status = 'pending';

-- Atomically claim one pending payout (FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION claim_pending_payout()
RETURNS SETOF payout_queue
LANGUAGE sql
AS $$
  UPDATE payout_queue
  SET status = 'processing', attempts = attempts + 1
  WHERE id = (
    SELECT id FROM payout_queue
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
