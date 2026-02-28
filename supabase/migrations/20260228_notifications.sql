-- Task 03: Notifications table for payout results and match outcomes

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('payout_completed', 'payout_failed', 'match_result')),
  title text NOT NULL,
  message text NOT NULL,
  match_id uuid REFERENCES matches(id),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching unread notifications by wallet
CREATE INDEX idx_notifications_wallet_unread ON notifications (wallet_address, created_at DESC)
  WHERE read = false;
