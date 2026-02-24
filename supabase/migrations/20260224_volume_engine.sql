-- ============================================================
-- PHASE 5: VOLUME ENGINE MIGRATION
-- Battle Royale, Matchmaking Queue, Seasons, Scheduled Events
-- ============================================================

-- ============================================================
-- 1. BATTLE ROYALES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS battle_royales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bifrost', 'midgard', 'asgard')),
  origin TEXT NOT NULL DEFAULT 'custom' CHECK (origin IN ('scheduled', 'custom')),
  min_agents INTEGER NOT NULL DEFAULT 3,
  max_agents INTEGER,
  buy_in_sol DECIMAL(18, 9) NOT NULL,
  payout_structure TEXT NOT NULL DEFAULT 'winner_takes_all' CHECK (payout_structure IN ('winner_takes_all', 'top_three')),
  platform_fee_pct DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  num_rounds INTEGER NOT NULL DEFAULT 3,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  current_round INTEGER NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES agents(id),
  second_place_id UUID REFERENCES agents(id),
  third_place_id UUID REFERENCES agents(id),
  total_pool_sol DECIMAL(18, 9) NOT NULL DEFAULT 0,
  solana_tx_hash TEXT,
  created_by_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for battle_royales
CREATE INDEX IF NOT EXISTS idx_battle_royales_status ON battle_royales(status);
CREATE INDEX IF NOT EXISTS idx_battle_royales_tier ON battle_royales(tier);
CREATE INDEX IF NOT EXISTS idx_battle_royales_registration ON battle_royales(registration_closes_at);
CREATE INDEX IF NOT EXISTS idx_battle_royales_created_at ON battle_royales(created_at DESC);

-- ============================================================
-- 2. BATTLE ROYALE PARTICIPANTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS battle_royale_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battle_royales(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  round_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER,
  payout_sol DECIMAL(18, 9) NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(battle_id, agent_id)
);

-- Indexes for battle_royale_participants
CREATE INDEX IF NOT EXISTS idx_br_participants_battle ON battle_royale_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_br_participants_agent ON battle_royale_participants(agent_id);
CREATE INDEX IF NOT EXISTS idx_br_participants_score ON battle_royale_participants(total_score DESC);

-- ============================================================
-- 3. BATTLE ROYALE ROUNDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS battle_royale_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battle_royales(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(battle_id, round_number)
);

-- Indexes for battle_royale_rounds
CREATE INDEX IF NOT EXISTS idx_br_rounds_battle ON battle_royale_rounds(battle_id);
CREATE INDEX IF NOT EXISTS idx_br_rounds_status ON battle_royale_rounds(status);

-- ============================================================
-- 4. BATTLE ROYALE BETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS battle_royale_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battle_royales(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id),
  amount_sol DECIMAL(18, 9) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refunded')),
  payout_sol DECIMAL(18, 9) NOT NULL DEFAULT 0,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for battle_royale_bets
CREATE INDEX IF NOT EXISTS idx_br_bets_battle ON battle_royale_bets(battle_id);
CREATE INDEX IF NOT EXISTS idx_br_bets_wallet ON battle_royale_bets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_br_bets_agent ON battle_royale_bets(agent_id);

-- ============================================================
-- 5. MATCHMAKING QUEUE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  tier TEXT NOT NULL CHECK (tier IN ('bifrost', 'midgard', 'asgard')),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired')),
  matched_with UUID REFERENCES agents(id),
  match_id UUID
);

-- Indexes for matchmaking_queue
CREATE INDEX IF NOT EXISTS idx_queue_tier ON matchmaking_queue(tier);
CREATE INDEX IF NOT EXISTS idx_queue_status ON matchmaking_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_agent ON matchmaking_queue(agent_id);
CREATE INDEX IF NOT EXISTS idx_queue_queued_at ON matchmaking_queue(queued_at);

-- ============================================================
-- 6. SEASONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for seasons
CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_number ON seasons(season_number DESC);

-- ============================================================
-- 7. SEASON STANDINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS season_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  final_elo INTEGER NOT NULL DEFAULT 1000,
  final_rank INTEGER NOT NULL DEFAULT 0,
  total_matches INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_earnings_sol DECIMAL(18, 9) NOT NULL DEFAULT 0,
  battle_royale_wins INTEGER NOT NULL DEFAULT 0,
  UNIQUE(season_id, agent_id)
);

-- Indexes for season_standings
CREATE INDEX IF NOT EXISTS idx_standings_season ON season_standings(season_id);
CREATE INDEX IF NOT EXISTS idx_standings_agent ON season_standings(agent_id);
CREATE INDEX IF NOT EXISTS idx_standings_rank ON season_standings(final_rank);

-- ============================================================
-- 8. SCHEDULED EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bifrost', 'midgard', 'asgard')),
  cron_expression TEXT NOT NULL,
  buy_in_sol DECIMAL(18, 9) NOT NULL,
  min_agents INTEGER NOT NULL DEFAULT 4,
  num_rounds INTEGER NOT NULL DEFAULT 3,
  payout_structure TEXT NOT NULL DEFAULT 'winner_takes_all' CHECK (payout_structure IN ('winner_takes_all', 'top_three')),
  registration_window_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scheduled_events
CREATE INDEX IF NOT EXISTS idx_events_tier ON scheduled_events(tier);
CREATE INDEX IF NOT EXISTS idx_events_active ON scheduled_events(is_active);

-- ============================================================
-- 9. ALTER AGENTS TABLE - Add tier registrations
-- ============================================================

ALTER TABLE agents ADD COLUMN IF NOT EXISTS registered_tiers TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_season_elo INTEGER DEFAULT 1000;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_season_wins INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_season_matches INTEGER DEFAULT 0;

-- ============================================================
-- 10. ALTER MATCHES TABLE - Add tier
-- ============================================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'midgard' CHECK (tier IN ('bifrost', 'midgard', 'asgard'));

-- ============================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE battle_royales ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_royale_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_royale_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_royale_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables
CREATE POLICY "Allow public read battle_royales" ON battle_royales FOR SELECT USING (true);
CREATE POLICY "Allow public read battle_royale_participants" ON battle_royale_participants FOR SELECT USING (true);
CREATE POLICY "Allow public read battle_royale_rounds" ON battle_royale_rounds FOR SELECT USING (true);
CREATE POLICY "Allow public read battle_royale_bets" ON battle_royale_bets FOR SELECT USING (true);
CREATE POLICY "Allow public read matchmaking_queue" ON matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "Allow public read seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Allow public read season_standings" ON season_standings FOR SELECT USING (true);
CREATE POLICY "Allow public read scheduled_events" ON scheduled_events FOR SELECT USING (true);

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access battle_royales" ON battle_royales FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access battle_royale_participants" ON battle_royale_participants FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access battle_royale_rounds" ON battle_royale_rounds FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access battle_royale_bets" ON battle_royale_bets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access matchmaking_queue" ON matchmaking_queue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access seasons" ON seasons FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access season_standings" ON season_standings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access scheduled_events" ON scheduled_events FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 12. ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE battle_royales;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_royale_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_royale_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;

-- ============================================================
-- 13. INSERT INITIAL SEASON
-- ============================================================

INSERT INTO seasons (season_number, name, starts_at, ends_at, status)
VALUES (1, 'Genesis Season', NOW(), NOW() + INTERVAL '3 months', 'active')
ON CONFLICT (season_number) DO NOTHING;

-- ============================================================
-- 14. INSERT SAMPLE SCHEDULED EVENTS
-- ============================================================

INSERT INTO scheduled_events (name, tier, cron_expression, buy_in_sol, min_agents, num_rounds, payout_structure, registration_window_minutes)
VALUES
  ('Daily Bifrost Brawl', 'bifrost', '0 12 * * *', 0.01, 3, 3, 'winner_takes_all', 30),
  ('Midgard Showdown', 'midgard', '0 18 * * *', 0.1, 4, 3, 'top_three', 45),
  ('Asgard Championship', 'asgard', '0 20 * * 6', 1.0, 4, 5, 'top_three', 60)
ON CONFLICT DO NOTHING;
