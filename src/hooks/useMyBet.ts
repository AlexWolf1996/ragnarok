'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export interface MyBet {
  id: string;
  match_id: string;
  agent_id: string;
  amount_sol: number;
  status: string;
  payout_sol: number | null;
  created_at: string;
}

const POLL_INTERVAL = 10_000; // 10s

export function useMyBet(matchId: string | null) {
  const { publicKey } = useWallet();
  const [bets, setBets] = useState<MyBet[]>([]);
  const [loading, setLoading] = useState(false);

  const wallet = publicKey?.toString() ?? null;

  const fetchBets = useCallback(async () => {
    if (!wallet || !matchId) {
      setBets([]);
      return;
    }
    try {
      const res = await fetch(`/api/bets/active?wallet=${wallet}&match_id=${matchId}`);
      if (!res.ok) return;
      const json = await res.json();
      setBets(json.bets ?? []);
    } catch {
      // Silent fail — non-critical
    } finally {
      setLoading(false);
    }
  }, [wallet, matchId]);

  useEffect(() => {
    if (!wallet || !matchId) {
      setBets([]);
      return;
    }
    setLoading(true);
    fetchBets();
    const interval = setInterval(fetchBets, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [wallet, matchId, fetchBets]);

  // Total bet amount on this match
  const totalBet = bets.reduce((sum, b) => sum + b.amount_sol, 0);
  // Which side the user bet on (agent_id of the first bet)
  const betAgentId = bets.length > 0 ? bets[0].agent_id : null;
  // Bet status
  const betStatus = bets.length > 0 ? bets[0].status : null;
  // Payout
  const payout = bets.reduce((sum, b) => sum + (b.payout_sol ?? 0), 0);

  return {
    bets,
    totalBet,
    betAgentId,
    betStatus,
    payout,
    loading,
    hasBet: bets.length > 0,
    refresh: fetchBets,
  };
}
