'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Trophy, Coins } from 'lucide-react';
import {
  BattleRoyaleWithRelations,
  TIER_CONFIG,
  formatTimeRemaining,
  calculatePayoutPreview,
  isRegistrationOpen,
} from '@/types/battleRoyale';

interface BattleRoyaleCardProps {
  battle: BattleRoyaleWithRelations;
  onJoin?: (battleId: string) => void;
  onView?: (battleId: string) => void;
  showActions?: boolean;
}

export default function BattleRoyaleCard({
  battle,
  onJoin,
  onView,
  showActions = true,
}: BattleRoyaleCardProps) {
  const tierConfig = TIER_CONFIG[battle.tier];
  const registrationOpen = isRegistrationOpen(battle);

  const payoutPreview = useMemo(() => {
    return calculatePayoutPreview(
      battle.buy_in_sol,
      Math.max(battle.participant_count, battle.min_agents),
      battle.platform_fee_pct,
      battle.payout_structure
    );
  }, [battle]);

  const statusConfig = {
    open: { label: 'OPEN', color: '#4fc3f7', pulse: true },
    in_progress: { label: 'LIVE', color: '#22c55e', pulse: true },
    completed: { label: 'ENDED', color: '#666670', pulse: false },
    cancelled: { label: 'CANCELLED', color: '#ef4444', pulse: false },
  };

  const status = statusConfig[battle.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-[#111118] border border-[#2a2a35] rounded-sm overflow-hidden
                 hover:border-[#3a3a45] transition-colors duration-200 group"
    >
      {/* Tier accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: tierConfig.color }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
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
              <span
                className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm flex items-center gap-1"
                style={{
                  backgroundColor: `${status.color}20`,
                  color: status.color,
                }}
              >
                {status.pulse && (
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: status.color }}
                  />
                )}
                {status.label}
              </span>
            </div>
            <h3 className="font-mono text-sm text-[#e8e8e8] font-medium truncate max-w-[200px]">
              {battle.name}
            </h3>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg text-[#d4a843] font-semibold">
              {payoutPreview.firstPlace.toFixed(2)}
            </div>
            <div className="font-mono text-[10px] text-[#666670] tracking-wider">
              SOL PRIZE
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-[#888890]">
            <Users size={12} aria-hidden="true" />
            <span className="font-mono text-xs">
              {battle.participant_count}
              {battle.max_agents && `/${battle.max_agents}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#888890]">
            <Coins size={12} aria-hidden="true" />
            <span className="font-mono text-xs">
              {battle.buy_in_sol} SOL
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#888890]">
            <Trophy size={12} aria-hidden="true" />
            <span className="font-mono text-xs">
              {battle.num_rounds} RND
            </span>
          </div>
        </div>

        {/* Time remaining or progress */}
        {battle.status === 'open' && (
          <div className="flex items-center gap-1.5 text-[#4fc3f7] mb-4">
            <Clock size={12} aria-hidden="true" />
            <span className="font-mono text-xs">
              Registration: {formatTimeRemaining(battle.registration_closes_at)}
            </span>
          </div>
        )}

        {battle.status === 'in_progress' && (
          <div className="flex items-center gap-1.5 text-[#22c55e] mb-4">
            <span className="font-mono text-xs">
              Round {battle.current_round}/{battle.num_rounds}
            </span>
          </div>
        )}

        {battle.status === 'completed' && battle.winner && (
          <div className="flex items-center gap-2 text-[#d4a843] mb-4">
            <Trophy size={12} aria-hidden="true" />
            <span className="font-mono text-xs">
              Winner: {battle.winner.name}
            </span>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2">
            {battle.status === 'open' && registrationOpen && onJoin && (
              <button
                onClick={() => onJoin(battle.id)}
                className="flex-1 py-2 font-mono text-xs tracking-wider
                         bg-[#d4a843] text-[#0a0a0f] rounded-sm
                         hover:bg-[#e4b853] transition-colors duration-200"
              >
                JOIN BATTLE
              </button>
            )}
            {onView && (
              <button
                onClick={() => onView(battle.id)}
                className="flex-1 py-2 font-mono text-xs tracking-wider
                         border border-[#2a2a35] text-[#888890] rounded-sm
                         hover:border-[#3a3a45] hover:text-[#e8e8e8] transition-colors duration-200"
              >
                {battle.status === 'in_progress' ? 'WATCH LIVE' : 'VIEW DETAILS'}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
