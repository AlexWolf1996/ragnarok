-- M3: Atomic operations for Battle Royale concurrency safety

-- Lock a battle for execution (prevents concurrent execution)
CREATE OR REPLACE FUNCTION lock_battle_for_execution(p_battle_id UUID)
RETURNS SETOF battle_royales
LANGUAGE sql
AS $$
  SELECT * FROM battle_royales
  WHERE id = p_battle_id AND status = 'in_progress'
  FOR UPDATE SKIP LOCKED;
$$;

-- Lock a battle for start (prevents concurrent start)
CREATE OR REPLACE FUNCTION lock_battle_for_start(p_battle_id UUID)
RETURNS SETOF battle_royales
LANGUAGE sql
AS $$
  SELECT * FROM battle_royales
  WHERE id = p_battle_id AND status = 'open'
  FOR UPDATE SKIP LOCKED;
$$;

-- Atomic join: insert participant + increment counts in one transaction
CREATE OR REPLACE FUNCTION atomic_br_join(
  p_battle_id UUID,
  p_agent_id UUID,
  p_buy_in_sol DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  -- Lock the battle row to prevent concurrent count updates
  PERFORM id FROM battle_royales
  WHERE id = p_battle_id AND status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found or not open';
  END IF;

  -- Insert participant
  INSERT INTO battle_royale_participants (battle_id, agent_id, round_scores, total_score, payout_sol)
  VALUES (p_battle_id, p_agent_id, '[]'::jsonb, 0, 0)
  RETURNING id INTO v_participant_id;

  -- Atomically increment counts
  UPDATE battle_royales
  SET participant_count = participant_count + 1,
      total_pool_sol = total_pool_sol + p_buy_in_sol
  WHERE id = p_battle_id;

  RETURN v_participant_id;
END;
$$;
