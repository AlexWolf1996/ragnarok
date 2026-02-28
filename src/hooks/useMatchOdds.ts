'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MatchOddsData {
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

const RAKE = 0.05;
const POLL_INTERVAL = 5_000; // 5s

/**
 * Client-side odds calculation (mirrors backend logic).
 * Used for payout preview before the bet is placed.
 */
export function calculateOdds(poolA: number, poolB: number) {
  const total = poolA + poolB;
  if (total === 0) return { oddsA: 2.0, oddsB: 2.0, impliedA: 50, impliedB: 50 };
  const afterRake = total * (1 - RAKE);
  const oddsA = poolA > 0 ? afterRake / poolA : 0;
  const oddsB = poolB > 0 ? afterRake / poolB : 0;
  const impliedA = Math.round((poolB / total) * 100);
  const impliedB = Math.round((poolA / total) * 100);
  return {
    oddsA: Math.max(oddsA, 1.01),
    oddsB: Math.max(oddsB, 1.01),
    impliedA,
    impliedB,
  };
}

export function useMatchOdds(matchId: string | null, status: string | null) {
  const [odds, setOdds] = useState<MatchOddsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll odds during betting, battle, and judging (so users see their position)
  const shouldPoll = !!matchId && (status === 'betting_open' || status === 'in_progress' || status === 'judging');

  const fetchOdds = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await fetch(`/api/matches/${matchId}/odds`);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      setOdds(json.odds ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!shouldPoll) {
      setOdds(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchOdds();
    const interval = setInterval(() => {
      if (!cancelled) fetchOdds();
    }, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [shouldPoll, fetchOdds]);

  // Derived values
  const derived = odds
    ? calculateOdds(odds.poolA, odds.poolB)
    : { oddsA: 2.0, oddsB: 2.0, impliedA: 50, impliedB: 50 };

  return {
    poolA: odds?.poolA ?? 0,
    poolB: odds?.poolB ?? 0,
    oddsA: derived.oddsA,
    oddsB: derived.oddsB,
    impliedA: derived.impliedA,
    impliedB: derived.impliedB,
    totalPool: odds?.totalPool ?? 0,
    loading,
    error,
  };
}
