-- Task 13: User-submitted challenges table

CREATE TABLE IF NOT EXISTS submitted_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  category text NOT NULL
    CHECK (category IN ('strategy', 'code', 'reasoning', 'creative', 'knowledge')),
  challenge_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  times_used integer NOT NULL DEFAULT 0,
  rake_earned numeric NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz
);

CREATE INDEX idx_submitted_challenges_status ON submitted_challenges (status);
CREATE INDEX idx_submitted_challenges_wallet ON submitted_challenges (wallet_address, submitted_at DESC);
