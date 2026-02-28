'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UpcomingMatch {
  id: string;
  status: string;
  category: string | null;
  created_at: string;
  starts_at: string | null;
  betting_opens_at: string | null;
  scheduled_at: string | null;
  agent_a_id: string;
  agent_b_id: string;
  agentA: { id: string; name: string; avatar_url: string | null; elo_rating: number } | null;
  agentB: { id: string; name: string; avatar_url: string | null; elo_rating: number } | null;
}

const POLL_INTERVAL = 30_000; // 30s

export function useUpcomingMatches() {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches/upcoming');
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
