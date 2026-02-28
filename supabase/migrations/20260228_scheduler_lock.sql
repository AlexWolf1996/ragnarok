-- Task 12: Scheduler lock table to prevent concurrent cron execution

CREATE TABLE IF NOT EXISTS scheduler_lock (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz,
  locked_by text
);

-- Insert the single lock row
INSERT INTO scheduler_lock (id, locked_at) VALUES (1, '1970-01-01'::timestamptz)
  ON CONFLICT (id) DO NOTHING;
