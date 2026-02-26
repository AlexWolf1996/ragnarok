-- ============================================
-- RAGNAROK: Add Betting Columns to Matches
-- Run this in Supabase SQL Editor
-- ============================================

-- Add betting columns to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS bet_amount_lamports BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bettor_wallet TEXT,
ADD COLUMN IF NOT EXISTS bettor_pick_id UUID REFERENCES agents(id),
ADD COLUMN IF NOT EXISTS bet_tx_signature TEXT,
ADD COLUMN IF NOT EXISTS payout_tx_signature TEXT,
ADD COLUMN IF NOT EXISTS bet_status TEXT DEFAULT 'none' CHECK (bet_status IN ('none', 'pending', 'won', 'lost', 'paid', 'refunded'));

-- Add tier column if not exists
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'midgard' CHECK (tier IN ('bifrost', 'midgard', 'asgard'));

-- Create index for finding bets by wallet
CREATE INDEX IF NOT EXISTS idx_matches_bettor_wallet ON matches(bettor_wallet) WHERE bettor_wallet IS NOT NULL;

-- Create index for finding unpaid wins
CREATE INDEX IF NOT EXISTS idx_matches_bet_status ON matches(bet_status) WHERE bet_status IN ('won', 'pending');

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'matches'
AND column_name IN ('bet_amount_lamports', 'bettor_wallet', 'bettor_pick_id', 'bet_tx_signature', 'payout_tx_signature', 'bet_status', 'tier')
ORDER BY column_name;
