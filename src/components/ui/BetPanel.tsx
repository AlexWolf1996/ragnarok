'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Tables } from '@/lib/supabase/types';
import { placeBet, getMatchBets } from '@/lib/supabase/client';

type Agent = Tables<'agents'>;
type Match = Tables<'matches'> & {
  agent_a: Agent | null;
  agent_b: Agent | null;
};

interface BetPanelProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onBetPlaced?: () => void;
}

function calculateOdds(agentAElo: number, agentBElo: number) {
  const expectedA = 1 / (1 + Math.pow(10, (agentBElo - agentAElo) / 400));
  const expectedB = 1 - expectedA;
  return { agentA: expectedA, agentB: expectedB };
}

export default function BetPanel({ match, isOpen, onClose, onBetPlaced }: BetPanelProps) {
  const { publicKey, connected } = useWallet();
  const [selectedAgent, setSelectedAgent] = useState<'a' | 'b' | null>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [betPools, setBetPools] = useState<{ agentA: number; agentB: number }>({
    agentA: 0,
    agentB: 0,
  });

  const agentA = match?.agent_a;
  const agentB = match?.agent_b;

  const loadBetPools = useCallback(async () => {
    if (!match) return;
    try {
      const bets = await getMatchBets(match.id);
      const agentAPool = bets
        .filter((b) => b.agent_id === match.agent_a_id)
        .reduce((sum, b) => sum + b.amount_sol, 0);
      const agentBPool = bets
        .filter((b) => b.agent_id === match.agent_b_id)
        .reduce((sum, b) => sum + b.amount_sol, 0);
      setBetPools({ agentA: agentAPool, agentB: agentBPool });
    } catch {
      // Failed to load bet pools - continue with defaults
    }
  }, [match]);

  useEffect(() => {
    if (match) {
      loadBetPools();
    }
  }, [match, loadBetPools]);

  const odds = agentA && agentB
    ? calculateOdds(agentA.elo_rating, agentB.elo_rating)
    : { agentA: 0.5, agentB: 0.5 };

  async function handleSubmit() {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }
    if (!selectedAgent) {
      setError('Please select an agent to bet on');
      return;
    }
    if (!amount || parseFloat(amount) < 0.01) {
      setError('Minimum bet is 0.01 SOL');
      return;
    }
    if (parseFloat(amount) > 10) {
      setError('Maximum bet is 10 SOL');
      return;
    }
    if (!match) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await placeBet({
        match_id: match.id,
        agent_id: selectedAgent === 'a' ? match.agent_a_id : match.agent_b_id,
        wallet_address: publicKey.toBase58(),
        amount_sol: parseFloat(amount),
      });

      onBetPlaced?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && match && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] bg-[#0a0a0f] border border-[#1a1a25] rounded-sm z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a25]">
              <div className="flex items-center gap-2">
                <Coins className="text-[#666670]" size={18} />
                <h3 className="font-mono text-sm tracking-[0.15em] text-[#e8e8e8]">PLACE BET</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-[#1a1a25] rounded transition-colors"
              >
                <X size={18} className="text-[#666670]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Agent selection */}
              <div className="grid grid-cols-2 gap-3">
                {/* Agent A */}
                <button
                  type="button"
                  onClick={() => setSelectedAgent('a')}
                  className={`p-4 rounded-sm border transition-all ${
                    selectedAgent === 'a'
                      ? 'border-[#e8e8e8] bg-[#111118]'
                      : 'border-[#1a1a25] hover:border-[#333340]'
                  }`}
                >
                  <p className="font-mono text-sm text-[#e8e8e8] truncate">{agentA?.name}</p>
                  <p className="text-[10px] font-mono text-[#666670]">ELO: {agentA?.elo_rating}</p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-sm">
                    <TrendingUp size={12} className="text-[#666670]" />
                    <span className="font-mono text-[#e8e8e8]">
                      {(odds.agentA * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[#666670] mt-1">
                    Pool: {betPools.agentA.toFixed(2)} SOL
                  </p>
                </button>

                {/* Agent B */}
                <button
                  type="button"
                  onClick={() => setSelectedAgent('b')}
                  className={`p-4 rounded-sm border transition-all ${
                    selectedAgent === 'b'
                      ? 'border-[#e8e8e8] bg-[#111118]'
                      : 'border-[#1a1a25] hover:border-[#333340]'
                  }`}
                >
                  <p className="font-mono text-sm text-[#e8e8e8] truncate">{agentB?.name}</p>
                  <p className="text-[10px] font-mono text-[#666670]">ELO: {agentB?.elo_rating}</p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-sm">
                    <TrendingUp size={12} className="text-[#666670]" />
                    <span className="font-mono text-[#e8e8e8]">
                      {(odds.agentB * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[#666670] mt-1">
                    Pool: {betPools.agentB.toFixed(2)} SOL
                  </p>
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-[10px] font-mono text-[#666670] tracking-[0.2em] mb-2">
                  BET AMOUNT (SOL)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-[#111118] border border-[#1a1a25] rounded-sm focus:outline-none focus:border-[#333340] font-mono text-lg text-[#e8e8e8] placeholder-[#666670]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    {[0.1, 0.5, 1].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset.toString())}
                        className="px-2 py-1 text-[10px] font-mono bg-[#1a1a25] hover:bg-[#333340] text-[#e8e8e8] rounded transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] font-mono text-[#666670] mt-1">
                  Min: 0.01 SOL | Max: 10 SOL
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#c41e3a]/10 border border-[#c41e3a]/30 rounded-sm">
                  <AlertCircle size={14} className="text-[#c41e3a]" />
                  <p className="text-sm font-mono text-[#c41e3a]">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!connected || isSubmitting || !selectedAgent || !amount}
                className="w-full py-3 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-sm tracking-[0.15em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:bg-[#e8e8e8] hover:text-[#0a0a0f]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    PLACING BET...
                  </>
                ) : !connected ? (
                  'CONNECT WALLET'
                ) : (
                  `BET ${amount || '0'} SOL`
                )}
              </button>

              <p className="text-[10px] font-mono text-[#666670] text-center">
                Bets are recorded off-chain. On-chain settlement coming soon.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
