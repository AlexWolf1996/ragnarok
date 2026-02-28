-- Task 01: Prevent double-spend by making bet_tx_signature unique
-- If the same Solana TX is submitted twice, the second insert/update will fail.

ALTER TABLE matches
  ADD CONSTRAINT matches_bet_tx_signature_unique UNIQUE (bet_tx_signature);
