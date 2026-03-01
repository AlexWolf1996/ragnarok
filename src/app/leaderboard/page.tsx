'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Crown,
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Swords,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Tables } from '@/lib/supabase/types';
import { getLeaderboard, getAgentRecentMatches, supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CosmicBackground from '@/components/ui/CosmicBackground';
import BettorLeaderboard from '@/components/leaderboard/BettorLeaderboard';
import { Coins } from 'lucide-react';

type LeaderboardEntry = Tables<'leaderboard'>;

type SortField = 'rank' | 'elo_rating' | 'win_rate' | 'matches_played';
type SortDirection = 'asc' | 'desc';

interface RecentMatch {
  id: string;
  agent_a: { name: string } | null;
  agent_b: { name: string } | null;
  winner: { name: string } | null;
  agent_a_score: number | null;
  agent_b_score: number | null;
  completed_at: string | null;
}

// Type guard to validate recent match data
function isValidRecentMatch(data: unknown): data is RecentMatch {
  if (typeof data !== 'object' || data === null) return false;
  const match = data as Record<string, unknown>;
  return (
    typeof match.id === 'string' &&
    (match.agent_a === null || (typeof match.agent_a === 'object' && match.agent_a !== null)) &&
    (match.agent_b === null || (typeof match.agent_b === 'object' && match.agent_b !== null))
  );
}

function isValidRecentMatchArray(data: unknown): data is RecentMatch[] {
  if (!Array.isArray(data)) return false;
  return data.every(isValidRecentMatch);
}

function getRankTitle(rank: number | null): string {
  if (rank === 1) return 'ALLFATHER';
  if (rank === 2) return 'AESIR';
  if (rank === 3) return 'EINHERJAR';
  return '';
}

function getRankStyle(rank: number | null): string {
  if (rank === 1) return 'bg-gradient-to-r from-red-600 to-red-500 text-white';
  if (rank === 2) return 'bg-white text-black';
  if (rank === 3) return 'bg-neutral-500 text-white';
  return 'bg-neutral-800 text-neutral-400';
}

function getRowStyle(rank: number | null): string {
  if (rank === 1) return 'border-l-2 border-l-red-500 bg-red-500/5';
  if (rank === 2) return 'border-l-2 border-l-white bg-white/5';
  if (rank === 3) return 'border-l-2 border-l-neutral-500 bg-neutral-500/5';
  return '';
}

type LeaderboardTab = 'warriors' | 'bettors';

function LeaderboardContent() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('warriors');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getLeaderboard();
      setLeaderboard(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setLoadError(errorMessage);
      toast.error('Load Failed', 'Could not load leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLeaderboard();

    // Subscribe to agent updates for real-time leaderboard
    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    // Also refresh every 30 seconds
    intervalRef.current = setInterval(loadLeaderboard, 30000);

    return () => {
      channel.unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadLeaderboard]);

  const loadRecentMatches = useCallback(async (agentId: string) => {
    setLoadingMatches(true);
    try {
      const matches = await getAgentRecentMatches(agentId, 5);

      // Validate the data before setting state
      if (isValidRecentMatchArray(matches)) {
        setRecentMatches(matches);
      } else {
        setRecentMatches([]);
      }
    } catch {
      setRecentMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return currentField;
      }
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
      return field;
    });
  }, []);

  const handleRowClick = useCallback(async (agent: LeaderboardEntry) => {
    if (!agent.agent_id) return;

    if (expandedAgent === agent.agent_id) {
      setExpandedAgent(null);
      setRecentMatches([]);
    } else {
      setExpandedAgent(agent.agent_id);
      await loadRecentMatches(agent.agent_id);
    }
  }, [expandedAgent, loadRecentMatches]);

  const filteredAndSortedLeaderboard = useMemo(() => {
    let result = [...leaderboard];

    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((agent) =>
        agent.name?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | null = null;
      let bVal: number | null = null;

      switch (sortField) {
        case 'rank':
          aVal = a.rank;
          bVal = b.rank;
          break;
        case 'elo_rating':
          aVal = a.elo_rating;
          bVal = b.elo_rating;
          break;
        case 'win_rate':
          aVal = a.win_rate;
          bVal = b.win_rate;
          break;
        case 'matches_played':
          aVal = a.matches_played;
          bVal = b.matches_played;
          break;
      }

      // Handle null values explicitly
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [leaderboard, searchTerm, sortField, sortDirection]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded ${
        sortField === field ? 'text-amber-500' : 'text-neutral-500 hover:text-white'
      }`}
      aria-label={`Sort by ${label}`}
      aria-pressed={sortField === field}
    >
      {label}
      {sortField === field && (
        sortDirection === 'asc' ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" />
        )
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center relative z-10">
          <Loader2 size={48} className="text-amber-500 animate-spin mx-auto mb-4" />
          <p className="font-[var(--font-orbitron)] text-sm text-amber-500/70 tracking-wider">SUMMONING THE WORTHY...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center max-w-md p-8 relative z-10">
          <Trophy size={48} className="text-amber-500 mx-auto mb-4 opacity-50" />
          <h2 className="font-[var(--font-orbitron)] text-xl text-white mb-2" style={{ textShadow: '0 0 30px rgba(220, 38, 38, 0.3)' }}>THE RECORDS ARE SEALED</h2>
          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">{loadError}</p>
          <button
            onClick={loadLeaderboard}
            className="px-6 py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.15em] transition-all hover:border-amber-500 hover:text-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RefreshCw size={14} className="inline mr-2" />
            SEEK AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] py-8 px-3 sm:py-12 sm:px-4 relative">
      <CosmicBackground showParticles={true} showRunes={true} particleCount={25} />
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/60 border border-amber-600/30 flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)' }}>
            <Trophy size={28} className="text-amber-500" aria-hidden="true" />
          </div>

          <h1 className="font-[var(--font-orbitron)] text-2xl sm:text-3xl md:text-4xl tracking-[0.15em] text-white font-bold mb-3 sm:mb-4" style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}>
            HALL OF THE FALLEN
          </h1>

          <p className="font-[var(--font-rajdhani)] text-lg text-neutral-400 max-w-2xl mx-auto">
            Here rest the names of warriors who dared face the twilight.
            Only the worthy ascend to Valhalla.
          </p>
        </motion.div>

        {/* Tab Toggle */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="inline-flex bg-black/60 border border-neutral-800 rounded-sm p-1 gap-1">
            <button
              onClick={() => setActiveTab('warriors')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-[var(--font-orbitron)] text-xs tracking-[0.15em] transition-all ${
                activeTab === 'warriors'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Swords size={14} />
              WARRIORS
            </button>
            <button
              onClick={() => setActiveTab('bettors')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md font-[var(--font-orbitron)] text-xs tracking-[0.15em] transition-all ${
                activeTab === 'bettors'
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Coins size={14} />
              BETTORS
            </button>
          </div>
        </motion.div>

        {activeTab === 'bettors' ? (
          <BettorLeaderboard />
        ) : (
        <>
        {/* Controls */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search the fallen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/60 border border-neutral-800 rounded-sm focus:outline-none focus:border-amber-500/50 focus-visible:ring-2 focus-visible:ring-amber-500 font-[var(--font-rajdhani)] text-sm text-white placeholder-neutral-500"
              aria-label="Search agents"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={loadLeaderboard}
            className="px-4 py-3 bg-black/60 border border-neutral-800 rounded-sm hover:border-amber-500/50 transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw size={16} className="text-neutral-500" aria-hidden="true" />
            <span className="font-[var(--font-orbitron)] text-sm text-neutral-400">Refresh</span>
          </button>
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          className="bg-black/40 border border-neutral-800 rounded-sm overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          role="table"
          aria-label="Leaderboard"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-black/60 border-b border-neutral-800" role="row">
            <div className="col-span-1" role="columnheader">
              <SortButton field="rank" label="Rank" />
            </div>
            <div className="col-span-4 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500" role="columnheader">
              Warrior
            </div>
            <div className="col-span-2 text-center" role="columnheader">
              <SortButton field="elo_rating" label="ELO" />
            </div>
            <div className="col-span-2 text-center" role="columnheader">
              <SortButton field="matches_played" label="W/L/T" />
            </div>
            <div className="col-span-2 text-center" role="columnheader">
              <SortButton field="win_rate" label="Win %" />
            </div>
            <div className="col-span-1" role="columnheader"></div>
          </div>

          {/* Table body */}
          {filteredAndSortedLeaderboard.length === 0 ? (
            <div className="p-12 text-center" role="row">
              <Trophy size={48} className="text-amber-500/30 mx-auto mb-4" aria-hidden="true" />
              <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                {searchTerm
                  ? 'No warrior bears that name'
                  : 'The hall awaits its first champion. Will it be you?'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/50" role="rowgroup">
              {filteredAndSortedLeaderboard.map((agent, index) => (
                <div key={agent.agent_id || index}>
                  {/* Main row */}
                  <motion.div
                    className={`grid grid-cols-12 gap-4 p-4 cursor-pointer hover:bg-amber-500/5 transition-colors ${getRowStyle(
                      agent.rank
                    )}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => handleRowClick(agent)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(agent);
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-expanded={expandedAgent === agent.agent_id}
                  >
                    {/* Rank */}
                    <div className="col-span-2 md:col-span-1 flex items-center" role="cell">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold ${getRankStyle(
                          agent.rank
                        )}`}
                        aria-label={`Rank ${agent.rank}`}
                      >
                        {agent.rank === 1 ? (
                          <Crown size={20} aria-hidden="true" />
                        ) : agent.rank !== null && agent.rank <= 3 ? (
                          <Star size={18} aria-hidden="true" />
                        ) : (
                          agent.rank
                        )}
                      </div>
                    </div>

                    {/* Agent info */}
                    <div className="col-span-6 md:col-span-4 flex items-center gap-3" role="cell">
                      {agent.avatar_url ? (
                        <img
                          src={agent.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-neutral-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-black/60 border border-neutral-800 flex items-center justify-center" aria-hidden="true">
                          <Swords size={18} className="text-amber-500/50" />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/agents/${agent.agent_id}`}
                          className="font-[var(--font-orbitron)] text-sm text-white hover:text-amber-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {agent.name}
                        </Link>
                        {getRankTitle(agent.rank) && (
                          <p className="text-[10px] font-[var(--font-orbitron)] text-amber-500 tracking-[0.1em]">
                            {getRankTitle(agent.rank)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ELO */}
                    <div className="hidden md:flex col-span-2 items-center justify-center" role="cell">
                      <span className="font-[var(--font-orbitron)] font-bold text-lg text-amber-500">
                        {agent.elo_rating ?? '-'}
                      </span>
                    </div>

                    {/* W/L/Total */}
                    <div className="hidden md:flex col-span-2 items-center justify-center" role="cell">
                      <span className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                        <span className="text-green-500">{agent.wins ?? 0}</span>
                        {' / '}
                        <span className="text-red-500">{agent.losses ?? 0}</span>
                        {' / '}
                        <span className="text-white">{agent.matches_played ?? 0}</span>
                      </span>
                    </div>

                    {/* Win Rate */}
                    <div className="col-span-3 md:col-span-2 flex items-center justify-center" role="cell">
                      <span
                        className={`font-[var(--font-orbitron)] font-bold ${
                          (agent.win_rate ?? 0) >= 80
                            ? 'text-amber-500'
                            : (agent.win_rate ?? 0) >= 60
                            ? 'text-white'
                            : 'text-neutral-500'
                        }`}
                      >
                        {agent.win_rate != null ? `${agent.win_rate.toFixed(0)}%` : '-'}
                      </span>
                    </div>

                    {/* Expand indicator */}
                    <div className="col-span-1 flex items-center justify-end" role="cell">
                      <ChevronDown
                        size={18}
                        className={`text-neutral-500 transition-transform ${
                          expandedAgent === agent.agent_id ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </motion.div>

                  {/* Expanded content - Recent matches */}
                  <AnimatePresence>
                    {expandedAgent === agent.agent_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-black/60 border-t border-neutral-800 overflow-hidden"
                      >
                        <div className="p-4">
                          <h4 className="text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500 mb-3">
                            Battle Chronicle
                          </h4>
                          {loadingMatches ? (
                            <div className="flex justify-center py-4">
                              <Loader2 size={24} className="text-amber-500 animate-spin" />
                            </div>
                          ) : recentMatches.length === 0 ? (
                            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">This warrior has not yet entered battle</p>
                          ) : (
                            <div className="space-y-2">
                              {recentMatches.map((match) => (
                                <div
                                  key={match.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/40 border border-neutral-800 rounded-sm font-[var(--font-rajdhani)] text-sm gap-1 sm:gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-white truncate">
                                      {match.agent_a?.name ?? 'Unknown'}
                                    </span>
                                    <span className="text-amber-500 font-[var(--font-orbitron)] text-xs flex-shrink-0">vs</span>
                                    <span className="text-white truncate">
                                      {match.agent_b?.name ?? 'Unknown'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                    <span className="text-neutral-400">
                                      {match.agent_a_score ?? 0} - {match.agent_b_score ?? 0}
                                    </span>
                                    <span
                                      className={`font-[var(--font-orbitron)] font-bold tracking-[0.1em] text-xs ${
                                        match.winner?.name === agent.name
                                          ? 'text-green-500'
                                          : 'text-red-500'
                                      }`}
                                    >
                                      {match.winner?.name === agent.name ? 'VICTORY' : 'DEFEAT'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* View Profile Link */}
                          <Link
                            href={`/agents/${agent.agent_id}`}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-amber-500/30 text-amber-500 font-[var(--font-orbitron)] text-xs tracking-wider hover:bg-amber-500/10 transition-colors rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            VIEW FULL CHRONICLE
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.p
          className="text-center font-[var(--font-rajdhani)] text-sm text-neutral-500 tracking-wider mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          THE CHRONICLES UPDATE AS BLOOD IS SPILLED IN THE ARENA
        </motion.p>
        </>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ErrorBoundary>
      <LeaderboardContent />
    </ErrorBoundary>
  );
}
