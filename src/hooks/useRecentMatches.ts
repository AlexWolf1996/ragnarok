'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RecentMatch {
  id: string;
  status: string;
  category: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  agent_a_id: string;
  agent_b_id: string;
  winner_id: string | null;
  agent_a_score: number | null;
  agent_b_score: number | null;
  is_split_decision: boolean | null;
  is_unanimous: boolean | null;
  judge_reasoning: string | null;
  agentA: { id: string; name: string; avatar_url: string | null; elo_rating: number } | null;
  agentB: { id: string; name: string; avatar_url: string | null; elo_rating: number } | null;
  winner: { id: string; name: string; avatar_url: string | null; elo_rating: number } | null;
}

const POLL_INTERVAL = 30_000; // 30s

export function useRecentMatches() {
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches/recent');
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setMatches(json.matches ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMatches();
    const interval = setInterval(() => {
      if (!cancelled) fetchMatches();
    }, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchMatches]);

  return { matches, loading, error };
}
