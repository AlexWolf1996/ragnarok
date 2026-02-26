-- Atomic agent stat update to prevent race conditions
-- when two battles involving the same agent finish simultaneously.
-- Uses SQL-level increments (wins = wins + 1) instead of read-then-write.

CREATE OR REPLACE FUNCTION update_agent_battle_stats(
  p_agent_id UUID,
  p_new_elo INT,
  p_is_winner BOOLEAN
) RETURNS void AS $$
BEGIN
  IF p_is_winner THEN
    UPDATE agents SET
      elo_rating = p_new_elo,
      wins = wins + 1,
      matches_played = matches_played + 1,
      updated_at = now()
    WHERE id = p_agent_id;
  ELSE
    UPDATE agents SET
      elo_rating = p_new_elo,
      losses = losses + 1,
      matches_played = matches_played + 1,
      updated_at = now()
    WHERE id = p_agent_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
