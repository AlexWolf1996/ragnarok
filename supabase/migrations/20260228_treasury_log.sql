-- Task 09: Treasury audit log for tracking all SOL movements

CREATE TABLE IF NOT EXISTS treasury_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL
    CHECK (type IN ('bet_received', 'payout_sent', 'rake_collected')),
  match_id uuid REFERENCES matches(id),
  wallet_address text NOT NULL,
  amount_sol numeric NOT NULL,
  tx_signature text NOT NULL,
  balance_after numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_log_created ON treasury_log (created_at DESC);
