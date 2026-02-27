'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Trophy } from 'lucide-react';
import {
  BattleRoyale,
  ArenaTier,
  TIER_CONFIG,
  formatTimeRemaining,
} from '@/types/battleRoyale';
import { getUpcomingBattles } from '@/lib/supabase/battleRoyale';
import TierSelector from './TierSelector';

interface UpcomingScheduleProps {
  onBattleSelect?: (battleId: string) => void;
}

export default function UpcomingSchedule({ onBattleSelect }: UpcomingScheduleProps) {
  const [battles, setBattles] = useState<BattleRoyale[]>([]);
  const [selectedTier, setSelectedTier] = useState<ArenaTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBattles = async () => {
      try {
        const data = await getUpcomingBattles(selectedTier || undefined, 10);
        setBattles(data);
      } catch {
        // Load failed - continue with empty battles
      } finally {
        setLoading(false);
      }
    };

    loadBattles();
    // Refresh every minute to update time remaining
    const interval = setInterval(loadBattles, 60000);
    return () => clearInterval(interval);
  }, [selectedTier]);

  // Group battles by date
  const groupedBattles = battles.reduce((groups, battle) => {
    const date = new Date(battle.registration_closes_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(battle);
    return groups;
  }, {} as Record<string, BattleRoyale[]>);

  return (
    <div className="bg-[#111118] border border-[#2a2a35] rounded-sm">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a35]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm text-[#e8e8e8] tracking-wider flex items-center gap-2">
            <Calendar size={14} />
            UPCOMING BATTLES
          </h3>
        </div>

        {/* Tier Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTier(null)}
            className={`px-3 py-1.5 font-mono text-xs tracking-wider border rounded-sm transition-colors
              ${!selectedTier
                ? 'border-[#e8e8e8] bg-[#e8e8e8]/10 text-[#e8e8e8]'
                : 'border-[#2a2a35] text-[#666670] hover:border-[#3a3a45]'
              }`}
          >
            ALL
          </button>
          <TierSelector
            selectedTier={selectedTier || 'midgard'}
            onTierChange={(tier) => setSelectedTier(tier === selectedTier ? null : tier)}
            showBuyIn={false}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : battles.length === 0 ? (
        <div className="p-8 text-center">
          <Calendar size={32} className="text-[#444450] mx-auto mb-2" />
          <p className="font-mono text-sm text-[#666670]">
            No upcoming battles scheduled
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a25]">
          {Object.entries(groupedBattles).map(([date, dateBattles]) => (
            <div key={date}>
              {/* Date header */}
              <div className="px-4 py-2 bg-[#0a0a0f]">
                <span className="font-mono text-xs text-[#666670] tracking-wider">
                  {date}
                </span>
              </div>

              {/* Battles */}
              {dateBattles.map((battle, index) => {
                const tierConfig = TIER_CONFIG[battle.tier];
                const timeRemaining = formatTimeRemaining(battle.registration_closes_at);

                return (
                  <motion.button
                    key={battle.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onBattleSelect?.(battle.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#1a1a25] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Time */}
                      <div className="w-16 text-center">
                        <div className="font-mono text-sm text-[#e8e8e8]">
                          {new Date(battle.registration_closes_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Tier badge */}
                      <span
                        className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: `${tierConfig.color}20`,
                          color: tierConfig.color,
                        }}
                      >
                        {tierConfig.name}
                      </span>

                      {/* Battle name */}
                      <div>
                        <div className="font-mono text-sm text-[#e8e8e8] truncate max-w-[180px]">
                          {battle.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[#666670]">
                            <Users size={10} />
                            <span className="font-mono text-[10px]">
                              min {battle.min_agents}
                            </span>
                          </span>
                          <span className="flex items-center gap-1 text-[#666670]">
                            <Trophy size={10} />
                            <span className="font-mono text-[10px]">
                              {battle.num_rounds} rounds
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm text-[#d4a843]">
                        {battle.buy_in_sol} SOL
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 mt-1">
                        <Clock size={10} />
                        <span className="font-mono text-[10px]">{timeRemaining}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
