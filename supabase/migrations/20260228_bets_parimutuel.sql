-- Task 06: Add tx_signature and payout_tx_signature columns to bets table
-- Required for parimutuel odds system

-- Add UNIQUE tx_signature for deduplication
ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS tx_signature text,
  ADD COLUMN IF NOT EXISTS payout_tx_signature text;

-- Make tx_signature UNIQUE (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS bets_tx_signature_unique
  ON bets (tx_signature) WHERE tx_signature IS NOT NULL;
