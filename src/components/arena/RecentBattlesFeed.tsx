'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Clock, Trophy, Skull, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface BattleHistoryItem {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  challenge: {
    id: string;
    name: string;
    type: string;
    difficulty: string;
  };
  agentA: {
    id: string;
    name: string;
    score: number | null;
    avatarUrl: string | null;
    eloRating?: number;
  };
  agentB: {
    id: string;
    name: string;
    score: number | null;
    avatarUrl: string | null;
    eloRating?: number;
  };
  winner: {
    id: string;
    name: string;
  } | null;
  reasoning: string | null;
}

interface RecentBattlesFeedProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onBattleClick?: (battleId: string) => void;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
    case 'bifrost':
      return 'text-amber-400';
    case 'medium':
    case 'midgard':
      return 'text-amber-400';
    case 'hard':
    case 'asgard':
      return 'text-red-400';
    default:
      return 'text-neutral-400';
  }
}

function getChallengeTypeIcon(type: string): string {
  switch (type) {
    case 'reasoning':
      return '🧠';
    case 'creative':
      return '🎨';
    case 'strategy':
      return '♟️';
    case 'code':
      return '💻';
    case 'knowledge':
      return '📚';
    default:
      return '⚔️';
  }
}

function getChallengeTypeBadgeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'reasoning':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'creative':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'strategy':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'code':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'knowledge':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default:
      return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  }
}

function getDifficultyBadgeColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
    case 'bifrost':
      return 'bg-amber-600/20 text-amber-300 border-amber-600/30';
    case 'medium':
    case 'midgard':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'hard':
    case 'asgard':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  }
}

export default function RecentBattlesFeed({
  limit = 10,
  autoRefresh = true,
  refreshInterval = 30000,
  onBattleClick,
}: RecentBattlesFeedProps) {
  const [battles, setBattles] = useState<BattleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedBattleId, setExpandedBattleId] = useState<string | null>(null);

  const fetchBattles = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);

    try {
      const response = await fetch(`/api/battles/history?limit=${limit}&status=completed`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch battles');
      }

      setBattles(data.matches || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load battles');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchBattles();
  }, [fetchBattles]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchBattles(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchBattles]);

  const handleBattleClick = (battleId: string) => {
    if (onBattleClick) {
      onBattleClick(battleId);
    } else {
      setExpandedBattleId(expandedBattleId === battleId ? null : battleId);
    }
  };

  if (loading) {
    return (
      <div className="bg-black/40 border border-neutral-800 rounded-sm p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
            Loading battle history...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/40 border border-red-500/20 rounded-sm p-6 text-center">
        <Skull size={24} className="text-red-500/50 mx-auto mb-2" />
        <p className="font-[var(--font-rajdhani)] text-sm text-red-400">{error}</p>
        <button
          onClick={() => fetchBattles()}
          className="mt-3 px-4 py-2 text-xs font-[var(--font-orbitron)] text-neutral-400 hover:text-amber-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="bg-black/40 border border-neutral-800 rounded-sm p-8 text-center">
        <Swords size={32} className="text-amber-500/30 mx-auto mb-4" />
        <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
          No battles have been fought yet. Be the first to write history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-amber-500/70">
            LIVE FEED
          </span>
        </div>
        <button
          onClick={() => fetchBattles(true)}
          disabled={isRefreshing}
          className="p-1.5 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            size={14}
            className={`text-neutral-500 hover:text-amber-500 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Battles list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {battles.map((battle, index) => {
            const isWinnerA = battle.winner?.id === battle.agentA.id;
            const isWinnerB = battle.winner?.id === battle.agentB.id;
            const isExpanded = expandedBattleId === battle.id;

            // Detect upsets: lower-ELO agent wins by 20+ points
            const eloA = battle.agentA.eloRating || 1000;
            const eloB = battle.agentB.eloRating || 1000;
            const eloDiff = Math.abs(eloA - eloB);
            const isUpset = eloDiff >= 50 && battle.winner && (
              (isWinnerA && eloA < eloB) || (isWinnerB && eloB < eloA)
            );

            return (
              <motion.div
                key={battle.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <button
                  onClick={() => handleBattleClick(battle.id)}
                  className="w-full text-left bg-black/40 border border-neutral-800 hover:border-amber-500/30 rounded-sm p-3 transition-all group"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    {/* Challenge type icon */}
                    <div className="w-8 h-8 bg-black/60 rounded-sm flex items-center justify-center text-lg flex-shrink-0">
                      {getChallengeTypeIcon(battle.challenge.type)}
                    </div>

                    {/* Battle info */}
                    <div className="flex-1 min-w-0">
                      {/* Agents */}
                      <div className="flex items-center gap-2 text-sm">
                        <Link
                          href={`/agents/${battle.agentA.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-[var(--font-rajdhani)] font-bold truncate hover:underline ${
                            isWinnerA ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-400 hover:text-neutral-300'
                          }`}
                        >
                          {isWinnerA && <Trophy size={12} className="inline mr-1" />}
                          {battle.agentA.name}
                        </Link>
                        <span className="text-neutral-600 text-xs">vs</span>
                        <Link
                          href={`/agents/${battle.agentB.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-[var(--font-rajdhani)] font-bold truncate hover:underline ${
                            isWinnerB ? 'text-amber-400 hover:text-amber-300' : 'text-neutral-400 hover:text-neutral-300'
                          }`}
                        >
                          {isWinnerB && <Trophy size={12} className="inline mr-1" />}
                          {battle.agentB.name}
                        </Link>
                      </div>

                      {/* Challenge name & badges */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getChallengeTypeBadgeColor(battle.challenge.type)}`}>
                          {battle.challenge.type.toUpperCase()}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getDifficultyBadgeColor(battle.challenge.difficulty)}`}>
                          {battle.challenge.difficulty.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Upset badge + Scores */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isUpset && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400 font-[var(--font-orbitron)] animate-pulse whitespace-nowrap">
                          UPSET
                        </span>
                      )}
                      <div className="text-right">
                        <span
                          className={`font-mono text-sm font-bold ${
                            isWinnerA ? 'text-amber-400' : 'text-neutral-500'
                          }`}
                        >
                          {battle.agentA.score ?? '-'}
                        </span>
                        <span className="text-neutral-600 mx-1">:</span>
                        <span
                          className={`font-mono text-sm font-bold ${
                            isWinnerB ? 'text-amber-400' : 'text-neutral-500'
                          }`}
                        >
                          {battle.agentB.score ?? '-'}
                        </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-neutral-600 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        } group-hover:text-amber-500`}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-neutral-600">
                    <Clock size={10} />
                    <span>{getRelativeTime(battle.completedAt || battle.createdAt)}</span>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && battle.reasoning && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-neutral-800">
                          <span className="text-[10px] font-[var(--font-orbitron)] text-amber-500/70 tracking-wider">
                            JUDGE VERDICT
                          </span>
                          <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 mt-1 leading-relaxed">
                            {battle.reasoning}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
