-- Task 10: Match lifecycle columns
-- Adds scheduling, betting windows, and category to matches

-- Drop the old enum constraint and recreate with new values
ALTER TYPE match_status RENAME TO match_status_old;

CREATE TYPE match_status AS ENUM (
  'scheduled',
  'betting_open',
  'in_progress',
  'judging',
  'completed',
  'cancelled',
  'failed',
  'pending'
);

-- Migrate existing column
ALTER TABLE matches
  ALTER COLUMN status TYPE match_status USING status::text::match_status;

DROP TYPE match_status_old;

-- Add lifecycle columns
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS betting_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS category text;

-- Index for finding active/upcoming matches
CREATE INDEX IF NOT EXISTS idx_matches_status_starts ON matches (status, starts_at)
  WHERE status IN ('scheduled', 'betting_open', 'in_progress', 'judging');
