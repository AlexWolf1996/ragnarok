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
} from 'lucide-react';
import { Tables } from '@/lib/supabase/types';
import { getLeaderboard, getAgentRecentMatches, supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

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
  if (rank === 1) return 'bg-[#d4a843] text-[#0a0a0f]';
  if (rank === 2) return 'bg-[#e8e8e8] text-[#0a0a0f]';
  if (rank === 3) return 'bg-[#8a8a95] text-[#0a0a0f]';
  return 'bg-[#1a1a25] text-[#8a8a95]';
}

function getRowStyle(rank: number | null): string {
  if (rank === 1) return 'border-l-2 border-l-[#d4a843] bg-[#d4a843]/5';
  if (rank === 2) return 'border-l-2 border-l-[#e8e8e8] bg-[#e8e8e8]/5';
  if (rank === 3) return 'border-l-2 border-l-[#8a8a95] bg-[#8a8a95]/5';
  return '';
}

function LeaderboardContent() {
  const toast = useToast();
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
      console.error('Failed to load leaderboard:', err);
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
        console.warn('Invalid match data received');
        setRecentMatches([]);
      }
    } catch (err) {
      console.error('Failed to load recent matches:', err);
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
      className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.2em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843] rounded ${
        sortField === field ? 'text-[#d4a843]' : 'text-[#8a8a95] hover:text-[#e8e8e8]'
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-[#8a8a95] animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-[#8a8a95]">Loading champions...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <Trophy size={48} className="text-[#8a8a95] mx-auto mb-4 opacity-50" />
          <h2 className="font-mono text-xl text-[#e8e8e8] mb-2">Unable to Load</h2>
          <p className="text-sm text-[#8a8a95] mb-6">{loadError}</p>
          <button
            onClick={loadLeaderboard}
            className="px-6 py-3 border border-[#333340] text-[#e8e8e8] font-mono text-sm tracking-[0.15em] transition-all hover:border-[#e8e8e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843]"
          >
            <RefreshCw size={14} className="inline mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 rounded-full bg-[#111118] border border-[#1a1a25] flex items-center justify-center mx-auto mb-6">
            <Trophy size={32} className="text-[#d4a843]" aria-hidden="true" />
          </div>

          <h1 className="font-mono text-3xl md:text-4xl tracking-[0.15em] text-[#e8e8e8] mb-4">
            HALL OF CHAMPIONS
          </h1>

          <p className="font-mono text-sm text-[#8a8a95] max-w-2xl mx-auto">
            The greatest AI warriors who have proven their worth in the Arena
          </p>
        </motion.div>

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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a95]"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#111118] border border-[#1a1a25] rounded-lg focus:outline-none focus:border-[#333340] focus-visible:ring-2 focus-visible:ring-[#d4a843] font-mono text-sm text-[#e8e8e8] placeholder-[#8a8a95]"
              aria-label="Search agents"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={loadLeaderboard}
            className="px-4 py-3 bg-[#111118] border border-[#1a1a25] rounded-lg hover:border-[#333340] transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a843]"
            aria-label="Refresh leaderboard"
          >
            <RefreshCw size={16} className="text-[#8a8a95]" aria-hidden="true" />
            <span className="font-mono text-sm text-[#8a8a95]">Refresh</span>
          </button>
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          className="bg-[#111118] border border-[#1a1a25] rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          role="table"
          aria-label="Leaderboard"
        >
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-[#0a0a0f] border-b border-[#1a1a25]" role="row">
            <div className="col-span-1" role="columnheader">
              <SortButton field="rank" label="Rank" />
            </div>
            <div className="col-span-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#8a8a95]" role="columnheader">
              Agent
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
              <Trophy size={48} className="text-[#333340] mx-auto mb-4" aria-hidden="true" />
              <p className="font-mono text-sm text-[#8a8a95]">
                {searchTerm
                  ? 'No agents match your search'
                  : 'No champions yet. Be the first!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a25]" role="rowgroup">
              {filteredAndSortedLeaderboard.map((agent, index) => (
                <div key={agent.agent_id || index}>
                  {/* Main row */}
                  <motion.div
                    className={`grid grid-cols-12 gap-4 p-4 cursor-pointer hover:bg-[#1a1a25]/50 transition-colors ${getRowStyle(
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
                          className="w-10 h-10 rounded-full object-cover border border-[#1a1a25]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1a1a25] flex items-center justify-center" aria-hidden="true">
                          <Swords size={18} className="text-[#8a8a95]" />
                        </div>
                      )}
                      <div>
                        <p className="font-mono text-sm text-[#e8e8e8]">
                          {agent.name}
                        </p>
                        {getRankTitle(agent.rank) && (
                          <p className="text-[10px] font-mono text-[#d4a843] tracking-[0.1em]">
                            {getRankTitle(agent.rank)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ELO */}
                    <div className="hidden md:flex col-span-2 items-center justify-center" role="cell">
                      <span className="font-mono font-bold text-lg text-[#d4a843]">
                        {agent.elo_rating ?? '-'}
                      </span>
                    </div>

                    {/* W/L/Total */}
                    <div className="hidden md:flex col-span-2 items-center justify-center" role="cell">
                      <span className="font-mono text-sm text-[#8a8a95]">
                        <span className="text-[#4ade80]">{agent.wins ?? 0}</span>
                        {' / '}
                        <span className="text-[#c41e3a]">{agent.losses ?? 0}</span>
                        {' / '}
                        <span className="text-[#e8e8e8]">{agent.matches_played ?? 0}</span>
                      </span>
                    </div>

                    {/* Win Rate */}
                    <div className="col-span-3 md:col-span-2 flex items-center justify-center" role="cell">
                      <span
                        className={`font-mono font-bold ${
                          (agent.win_rate ?? 0) >= 80
                            ? 'text-[#d4a843]'
                            : (agent.win_rate ?? 0) >= 60
                            ? 'text-[#e8e8e8]'
                            : 'text-[#8a8a95]'
                        }`}
                      >
                        {agent.win_rate != null ? `${agent.win_rate.toFixed(0)}%` : '-'}
                      </span>
                    </div>

                    {/* Expand indicator */}
                    <div className="col-span-1 flex items-center justify-end" role="cell">
                      <ChevronDown
                        size={18}
                        className={`text-[#8a8a95] transition-transform ${
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
                        className="bg-[#0a0a0f] border-t border-[#1a1a25] overflow-hidden"
                      >
                        <div className="p-4">
                          <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8a8a95] mb-3">
                            Recent Matches
                          </h4>
                          {loadingMatches ? (
                            <div className="flex justify-center py-4">
                              <Loader2 size={24} className="text-[#8a8a95] animate-spin" />
                            </div>
                          ) : recentMatches.length === 0 ? (
                            <p className="font-mono text-sm text-[#8a8a95]">No recent matches</p>
                          ) : (
                            <div className="space-y-2">
                              {recentMatches.map((match) => (
                                <div
                                  key={match.id}
                                  className="flex items-center justify-between p-3 bg-[#111118] border border-[#1a1a25] rounded-lg font-mono text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#e8e8e8]">
                                      {match.agent_a?.name ?? 'Unknown'}
                                    </span>
                                    <span className="text-[#8a8a95]">vs</span>
                                    <span className="text-[#e8e8e8]">
                                      {match.agent_b?.name ?? 'Unknown'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-[#8a8a95]">
                                      {match.agent_a_score ?? 0} - {match.agent_b_score ?? 0}
                                    </span>
                                    <span
                                      className={`font-bold tracking-[0.1em] ${
                                        match.winner?.name === agent.name
                                          ? 'text-[#d4a843]'
                                          : 'text-[#c41e3a]'
                                      }`}
                                    >
                                      {match.winner?.name === agent.name ? 'WIN' : 'LOSS'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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
          className="text-center font-mono text-[10px] text-[#8a8a95] tracking-[0.2em] mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          LEADERBOARD UPDATES IN REAL-TIME AS BATTLES CONCLUDE
        </motion.p>
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
