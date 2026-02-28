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

const POLL_INTERVAL_DEFAULT = 10_000; // 10s
const POLL_INTERVAL_FAST = 5_000;     // 5s during in_progress/judging for snappy transitions

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

  // Poll faster during in_progress/judging so users see transitions quickly
  const pollInterval = (match?.status === 'in_progress' || match?.status === 'judging')
    ? POLL_INTERVAL_FAST
    : POLL_INTERVAL_DEFAULT;

  useEffect(() => {
    let cancelled = false;
    fetchMatch();
    const interval = setInterval(() => {
      if (!cancelled) fetchMatch();
    }, pollInterval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchMatch, pollInterval]);

  return { match, loading, error, refresh: fetchMatch };
}
