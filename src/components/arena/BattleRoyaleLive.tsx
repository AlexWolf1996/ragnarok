'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BattleRoyaleWithRelations,
  BattleRoyaleParticipant,
  BattleRoyaleRound,
  TIER_CONFIG,
  calculatePayoutPreview,
} from '@/types/battleRoyale';
import {
  getBattleById,
  getBattleParticipants,
  getBattleRounds,
  subscribeToBattle,
  subscribeToBattleParticipants,
  unsubscribe,
} from '@/lib/supabase/battleRoyale';

interface BattleRoyaleLiveProps {
  battleId: string;
  onBet?: (agentId: string) => void;
}

export default function BattleRoyaleLive({ battleId, onBet }: BattleRoyaleLiveProps) {
  const [battle, setBattle] = useState<BattleRoyaleWithRelations | null>(null);
  const [participants, setParticipants] = useState<BattleRoyaleParticipant[]>([]);
  const [rounds, setRounds] = useState<BattleRoyaleRound[]>([]);
  const [loading, setLoading] = useState(true);

  // Sort participants by score
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => b.total_score - a.total_score);
  }, [participants]);

  // Calculate payouts
  const payoutPreview = useMemo(() => {
    if (!battle) return null;
    return calculatePayoutPreview(
      battle.buy_in_sol,
      battle.participant_count,
      battle.platform_fee_pct,
      battle.payout_structure
    );
  }, [battle]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [battleData, participantsData, roundsData] = await Promise.all([
          getBattleById(battleId),
          getBattleParticipants(battleId),
          getBattleRounds(battleId),
        ]);

        setBattle(battleData);
        setParticipants(participantsData);
        setRounds(roundsData);
      } catch (err) {
        console.error('Error loading battle:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [battleId]);

  // Real-time subscriptions
  useEffect(() => {
    const battleChannel = subscribeToBattle(battleId, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setBattle((prev) => (prev ? { ...prev, ...payload.new } : null));
      }
    });

    const participantsChannel = subscribeToBattleParticipants(battleId, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setParticipants((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      }
    });

    return () => {
      unsubscribe(battleChannel);
      unsubscribe(participantsChannel);
    };
  }, [battleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="text-center text-[#666670] font-mono py-8">
        Battle not found
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[battle.tier];
  const currentRound = rounds.find((r) => r.status === 'in_progress');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="bg-[#111118] border rounded-sm p-4"
        style={{ borderColor: tierConfig.color }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{
                  backgroundColor: `${tierConfig.color}20`,
                  color: tierConfig.color,
                }}
              >
                {tierConfig.name}
              </span>
              {battle.status === 'in_progress' && (
                <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm
                               bg-[#22c55e]/20 text-[#22c55e] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <h2 className="font-mono text-xl text-[#e8e8e8]">{battle.name}</h2>
          </div>
          {payoutPreview && (
            <div className="text-right">
              <div className="font-mono text-2xl text-[#d4a843] font-semibold">
                {payoutPreview.firstPlace.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-[#666670]">SOL PRIZE</div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#888890]">
            <Users size={14} />
            <span className="font-mono text-sm">{battle.participant_count}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#888890]">
            <Clock size={14} />
            <span className="font-mono text-sm">
              Round {battle.current_round}/{battle.num_rounds}
            </span>
          </div>
        </div>

        {/* Round Progress */}
        <div className="flex gap-1 mt-4">
          {rounds.map((round, i) => (
            <div
              key={round.id}
              className={`flex-1 h-2 rounded-full transition-colors ${
                round.status === 'completed'
                  ? 'bg-[#22c55e]'
                  : round.status === 'in_progress'
                  ? 'bg-[#d4a843] animate-pulse'
                  : 'bg-[#2a2a35]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current Round */}
      {currentRound && (
        <motion.div
          key={currentRound.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111118] border border-[#d4a843]/50 rounded-sm p-4"
        >
          <div className="flex items-center gap-2 text-[#d4a843] mb-2">
            <Clock size={14} className="animate-pulse" />
            <span className="font-mono text-sm tracking-wider">
              ROUND {currentRound.round_number} IN PROGRESS
            </span>
          </div>
          {currentRound.challenge && (
            <div className="font-mono text-xs text-[#888890]">
              Challenge: {currentRound.challenge.type} ({currentRound.challenge.difficulty})
            </div>
          )}
        </motion.div>
      )}

      {/* Leaderboard */}
      <div className="bg-[#111118] border border-[#2a2a35] rounded-sm overflow-hidden">
        <div className="p-3 border-b border-[#2a2a35]">
          <h3 className="font-mono text-sm text-[#e8e8e8] tracking-wider">
            LEADERBOARD
          </h3>
        </div>

        <div className="divide-y divide-[#1a1a25]">
          <AnimatePresence mode="popLayout">
            {sortedParticipants.map((participant, index) => {
              const previousRank = participant.round_scores?.length > 0
                ? sortedParticipants.findIndex(
                    (p) =>
                      p.total_score - (p.round_scores?.slice(-1)[0]?.score || 0) >
                      participant.total_score - (participant.round_scores?.slice(-1)[0]?.score || 0)
                  ) + 1
                : index + 1;

              const rankChange = previousRank - (index + 1);

              return (
                <motion.div
                  key={participant.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center justify-between p-3 transition-colors
                    ${index < 3 ? 'bg-[#111118]' : 'bg-[#0a0a0f]'}
                    ${onBet ? 'hover:bg-[#1a1a25] cursor-pointer' : ''}`}
                  onClick={() => onBet?.(participant.agent_id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full font-mono text-sm
                        ${index === 0
                          ? 'bg-[#d4a843]/20 text-[#d4a843]'
                          : index === 1
                          ? 'bg-[#888890]/20 text-[#888890]'
                          : index === 2
                          ? 'bg-[#cd7f32]/20 text-[#cd7f32]'
                          : 'bg-[#1a1a25] text-[#666670]'
                        }`}
                    >
                      {index + 1}
                    </div>

                    {/* Agent info */}
                    <div>
                      <div className="font-mono text-sm text-[#e8e8e8]">
                        {participant.agent?.name || 'Unknown'}
                      </div>
                      <div className="font-mono text-[10px] text-[#666670]">
                        ELO: {participant.agent?.elo_rating || 1000}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Rank change */}
                    <div className="w-8 text-center">
                      {rankChange > 0 ? (
                        <TrendingUp size={14} className="text-[#22c55e] mx-auto" />
                      ) : rankChange < 0 ? (
                        <TrendingDown size={14} className="text-[#ef4444] mx-auto" />
                      ) : (
                        <Minus size={14} className="text-[#666670] mx-auto" />
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right min-w-[60px]">
                      <div className="font-mono text-lg text-[#e8e8e8]">
                        {participant.total_score}
                      </div>
                      <div className="font-mono text-[10px] text-[#666670]">
                        pts
                      </div>
                    </div>

                    {/* Payout preview */}
                    {payoutPreview && index < 3 && (
                      <div className="text-right min-w-[60px]">
                        <div className="font-mono text-sm text-[#d4a843]">
                          {index === 0
                            ? payoutPreview.firstPlace.toFixed(2)
                            : index === 1
                            ? payoutPreview.secondPlace.toFixed(2)
                            : payoutPreview.thirdPlace.toFixed(2)}
                        </div>
                        <div className="font-mono text-[10px] text-[#666670]">
                          SOL
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Winner announcement */}
      {battle.status === 'completed' && battle.winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#d4a843]/10 border border-[#d4a843] rounded-sm p-6 text-center"
        >
          <Trophy size={32} className="text-[#d4a843] mx-auto mb-2" />
          <div className="font-mono text-lg text-[#d4a843] tracking-wider">
            VICTORY
          </div>
          <div className="font-mono text-2xl text-[#e8e8e8] mt-2">
            {battle.winner.name}
          </div>
          {payoutPreview && (
            <div className="font-mono text-lg text-[#d4a843] mt-2">
              Won {payoutPreview.firstPlace.toFixed(2)} SOL
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
