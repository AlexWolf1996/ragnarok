'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import {
  BattleRoyaleWithRelations,
  BattleRoyaleParticipant,
  BattleRoyaleBet,
  calculateBettingOdds,
} from '@/types/battleRoyale';
import {
  getBattleById,
  getBattleParticipants,
  getBattleBets,
  placeBattleBet,
} from '@/lib/supabase/battleRoyale';

interface BettingModalProps {
  battleId: string;
  walletAddress: string;
  preselectedAgentId?: string;
  onClose: () => void;
  onBetPlaced?: () => void;
}

export default function BettingModal({
  battleId,
  walletAddress,
  preselectedAgentId,
  onClose,
  onBetPlaced,
}: BettingModalProps) {
  const [, setBattle] = useState<BattleRoyaleWithRelations | null>(null);
  const [participants, setParticipants] = useState<BattleRoyaleParticipant[]>([]);
  const [bets, setBets] = useState<BattleRoyaleBet[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(preselectedAgentId || null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate odds
  const odds = useMemo(() => {
    return calculateBettingOdds(bets, participants);
  }, [bets, participants]);

  // Get odds for selected agent
  const selectedOdds = useMemo(() => {
    if (!selectedAgentId) return null;
    return odds.find((o) => o.agentId === selectedAgentId);
  }, [odds, selectedAgentId]);

  // Calculate potential payout
  const potentialPayout = useMemo(() => {
    if (!selectedOdds || !amount) return 0;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return 0;
    return amountNum * selectedOdds.impliedOdds;
  }, [selectedOdds, amount]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [battleData, participantsData, betsData] = await Promise.all([
          getBattleById(battleId),
          getBattleParticipants(battleId),
          getBattleBets(battleId),
        ]);

        setBattle(battleData as BattleRoyaleWithRelations);
        setParticipants(participantsData);
        setBets(betsData);
      } catch {
        setError('Failed to load battle data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [battleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAgentId || !amount) {
      setError('Please select an agent and enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > 10) {
      setError('Maximum bet is 10 SOL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await placeBattleBet(battleId, selectedAgentId, amountNum, walletAddress);

      if (result.success) {
        onBetPlaced?.();
        onClose();
      } else {
        setError(result.error || 'Failed to place bet');
      }
    } catch {
      setError('Failed to place bet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f]/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[#111118] border border-[#2a2a35] rounded-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
          <h2 className="font-mono text-lg text-[#e8e8e8] tracking-wider">
            PLACE BET
          </h2>
          <button
            onClick={onClose}
            className="text-[#666670] hover:text-[#e8e8e8] transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-[#d4a843] animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Agent Selection */}
            <div>
              <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
                SELECT AGENT
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {participants.map((participant) => {
                  const agentOdds = odds.find((o) => o.agentId === participant.agent_id);
                  const isSelected = selectedAgentId === participant.agent_id;

                  return (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => setSelectedAgentId(participant.agent_id)}
                      className={`w-full flex items-center justify-between p-3 rounded-sm border transition-colors
                        ${isSelected
                          ? 'border-[#d4a843] bg-[#d4a843]/10'
                          : 'border-[#2a2a35] bg-[#0a0a0f] hover:border-[#3a3a45]'
                        }`}
                    >
                      <div className="text-left">
                        <div className="font-mono text-sm text-[#e8e8e8]">
                          {participant.agent?.name || 'Unknown'}
                        </div>
                        <div className="font-mono text-[10px] text-[#666670]">
                          Current Score: {participant.total_score}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-[#d4a843]">
                          {agentOdds?.impliedOdds.toFixed(2)}x
                        </div>
                        <div className="font-mono text-[10px] text-[#666670]">
                          odds
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
                BET AMOUNT (SOL)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                min={0.01}
                max={10}
                step={0.01}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a35] rounded-sm
                         font-mono text-lg text-[#e8e8e8] placeholder-[#444450]
                         focus:outline-none focus:border-[#d4a843] transition-colors"
              />
              <div className="flex gap-2 mt-2">
                {[0.1, 0.5, 1, 5].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="flex-1 py-1 font-mono text-xs text-[#666670] border border-[#2a2a35]
                             rounded-sm hover:border-[#3a3a45] hover:text-[#888890] transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Payout */}
            {selectedOdds && amount && (
              <div className="bg-[#0a0a0f] border border-[#1a1a25] rounded-sm p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#888890]">
                    <TrendingUp size={14} />
                    <span className="font-mono text-xs">Potential Payout</span>
                  </div>
                  <div className="font-mono text-lg text-[#22c55e]">
                    {potentialPayout.toFixed(2)} SOL
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 text-[#f59e0b] text-xs">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span className="font-mono">
                Betting is risky. Only bet what you can afford to lose.
              </span>
            </div>

            {error && (
              <p className="font-mono text-xs text-[#ef4444]">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !selectedAgentId || !amount}
              className="w-full py-3 font-mono text-sm tracking-wider
                       bg-[#d4a843] text-[#0a0a0f] rounded-sm
                       hover:bg-[#e4b853] transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'PLACE BET'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
