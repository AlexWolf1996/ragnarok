'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MatchAgent {
  id: string;
  name: string;
  avatar_url: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  matches_played: number;
}

export interface MatchOdds {
  poolA: number;
  poolB: number;
  totalPool: number;
  rake: number;
  prizePool: number;
  oddsA: number;
  oddsB: number;
  agentAId: string;
  agentBId: string;
}

export interface CurrentMatch {
  id: string;
  status: string;
  category: string | null;
  created_at: string;
  started_at: string | null;
  starts_at: string | null;
  betting_opens_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  agent_a_id: string;
  agent_b_id: string;
  winner_id: string | null;
  agent_a_score: number | null;
  agent_b_score: number | null;
  agentA: MatchAgent | null;
  agentB: MatchAgent | null;
  odds: MatchOdds | null;
  timeRemainingMs: number | null;
}

const POLL_INTERVAL = 10_000; // 10s

export function useCurrentMatch() {
  const [match, setMatch] = useState<CurrentMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch('/api/matches/current');
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setMatch(json.match ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await fetchMatch();
    };
    run();
    const interval = setInterval(() => {
      if (!cancelled) fetchMatch();
    }, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchMatch]);

  return { match, loading, error, refresh: fetchMatch };
}
