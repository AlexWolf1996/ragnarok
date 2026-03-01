'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export interface MyChallenge {
  id: string;
  category: string;
  challenge_text: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  times_used: number;
  rake_earned: number;
  submitted_at: string;
}

const POLL_INTERVAL = 30_000; // 30s — challenges change rarely

export function useMyChallenges() {
  const { publicKey } = useWallet();
  const [challenges, setChallenges] = useState<MyChallenge[]>([]);
  const [loading, setLoading] = useState(false);

  const wallet = publicKey?.toString() ?? null;

  const fetchChallenges = useCallback(async () => {
    if (!wallet) {
      setChallenges([]);
      return;
    }
    try {
      const res = await fetch(`/api/challenges/mine?wallet=${wallet}`);
      if (!res.ok) return;
      const json = await res.json();
      setChallenges(json.challenges ?? []);
    } catch {
      // Silent fail — non-critical
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) {
      setChallenges([]);
      return;
    }
    setLoading(true);
    fetchChallenges();
    const interval = setInterval(fetchChallenges, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [wallet, fetchChallenges]);

  return { challenges, loading, refresh: fetchChallenges };
}
