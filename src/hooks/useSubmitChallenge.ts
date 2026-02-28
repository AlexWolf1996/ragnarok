'use client';

import { useState, useCallback } from 'react';

interface SubmitParams {
  wallet_address: string;
  category: string;
  challenge_text: string;
}

interface SubmitResult {
  id: string;
  status: 'approved' | 'rejected';
  rejection_reason: string | null;
}

export function useSubmitChallenge() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const submit = useCallback(async (params: SubmitParams) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const res = await fetch('/api/challenges/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit challenge');
      }

      setResult(json.submission);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
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

  return { submit, loading, error, success, result, reset };
}
