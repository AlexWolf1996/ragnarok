'use client';

import { useState, useCallback } from 'react';

interface PlaceBetParams {
  match_id: string;
  agent_id: string;
  amount_sol: number;
  tx_signature: string;
  wallet_address: string;
}

interface PlaceBetResult {
  bet_id: string;
  current_odds: {
    oddsA: number;
    oddsB: number;
  };
}

export function usePlaceBet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<PlaceBetResult | null>(null);

  const placeBet = useCallback(async (params: PlaceBetParams) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const res = await fetch('/api/bets/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: params.match_id,
          agent_id: params.agent_id,
          amount_sol: params.amount_sol,
          tx_signature: params.tx_signature,
          wallet_address: params.wallet_address,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to place bet');
      }

      setResult(json);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    setResult(null);
  }, []);

  return { placeBet, loading, error, success, result, reset };
}
