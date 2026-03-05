-- M1: Add Solana tx verification to spectator bets
-- Ensures every BR bet has a verified on-chain transaction (same as duel bets)

ALTER TABLE battle_royale_bets ADD COLUMN IF NOT EXISTS tx_signature TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS br_bets_tx_signature_unique
  ON battle_royale_bets (tx_signature) WHERE tx_signature IS NOT NULL;
