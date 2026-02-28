'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Coins, Crown, Star, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { getAllBetMatches } from '@/lib/supabase/client';
import { lamportsToSol } from '@/lib/solana/transfer';
import { useToast } from '@/hooks/useToast';

interface BetRow {
  bettor_wallet: string | null;
  bet_amount_lamports: number | null;
  bet_status: string | null;
  tier: string | null;
}

interface BettorStats {
  wallet: string;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  netPnl: number;
}

type SortField = 'rank' | 'netPnl' | 'winRate' | 'totalBets' | 'totalWagered';
type SortDirection = 'asc' | 'desc';

function shortenWallet(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function getRankStyle(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-r from-red-600 to-red-500 text-white';
  if (rank === 2) return 'bg-white text-black';
  if (rank === 3) return 'bg-neutral-500 text-white';
  return 'bg-neutral-800 text-neutral-400';
}

function getRowStyle(rank: number): string {
  if (rank === 1) return 'border-l-2 border-l-red-500 bg-red-500/5';
  if (rank === 2) return 'border-l-2 border-l-white bg-white/5';
  if (rank === 3) return 'border-l-2 border-l-neutral-500 bg-neutral-500/5';
  return '';
}

function getRankTitle(rank: number): string {
  if (rank === 1) return 'ODIN\'S CHOSEN';
  if (rank === 2) return 'GOLDEN HAND';
  if (rank === 3) return 'SILVER TONGUE';
  return '';
}

function aggregateBets(rows: BetRow[]): BettorStats[] {
  const byWallet = new Map<string, { bets: number; wins: number; losses: number; wagered: number; won: number }>();

  for (const row of rows) {
    if (!row.bettor_wallet || !row.bet_amount_lamports) continue;

    const existing = byWallet.get(row.bettor_wallet) || {
      bets: 0, wins: 0, losses: 0, wagered: 0, won: 0,
    };

    existing.bets++;
    const amount = lamportsToSol(row.bet_amount_lamports);
    existing.wagered += amount;

    if (row.bet_status === 'won' || row.bet_status === 'paid') {
      existing.wins++;
      existing.won += amount; // Approximate — actual payout depends on parimutuel odds
    } else if (row.bet_status === 'lost') {
      existing.losses++;
    }

    byWallet.set(row.bettor_wallet, existing);
  }

  const result: BettorStats[] = [];
  for (const [wallet, stats] of byWallet) {
    result.push({
      wallet,
      totalBets: stats.bets,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.bets > 0 ? (stats.wins / stats.bets) * 100 : 0,
      totalWagered: stats.wagered,
      totalWon: stats.won,
      netPnl: stats.won - stats.wagered,
    });
  }

  return result.sort((a, b) => b.netPnl - a.netPnl);
}

export default function BettorLeaderboard() {
  const toast = useToast();
  const [bettors, setBettors] = useState<BettorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('netPnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllBetMatches();
      setBettors(aggregateBets(data as BetRow[]));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      setError(msg);
      toast.error('Load Failed', msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((current) => {
      if (current === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDirection(field === 'rank' ? 'asc' : 'desc');
      return field;
    });
  }, []);

  const sorted = useMemo(() => {
    const list = [...bettors];
    list.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;
      switch (sortField) {
        case 'rank':
        case 'netPnl':
          aVal = a.netPnl; bVal = b.netPnl;
          break;
        case 'winRate':
          aVal = a.winRate; bVal = b.winRate;
          break;
        case 'totalBets':
          aVal = a.totalBets; bVal = b.totalBets;
          break;
        case 'totalWagered':
          aVal = a.totalWagered; bVal = b.totalWagered;
          break;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [bettors, sortField, sortDirection]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] transition-colors ${
        sortField === field ? 'text-amber-500' : 'text-neutral-500 hover:text-white'
      }`}
    >
      {label}
      {sortField === field && (
        sortDirection === 'asc'
          ? <ChevronUp size={14} />
          : <ChevronDown size={14} />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-center">
          <Loader2 size={48} className="text-amber-500 animate-spin mx-auto mb-4" />
          <p className="font-[var(--font-orbitron)] text-sm text-amber-500/70 tracking-wider">COUNTING THE SPOILS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <Coins size={48} className="text-amber-500 mx-auto mb-4 opacity-50" />
        <h2 className="font-[var(--font-orbitron)] text-xl text-white mb-2">THE LEDGER IS SEALED</h2>
        <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.15em] transition-all hover:border-amber-500 hover:text-amber-500"
        >
          <RefreshCw size={14} className="inline mr-2" />
          TRY AGAIN
        </button>
      </div>
    );
  }

  // Global stats
  const globalWagered = bettors.reduce((s, b) => s + b.totalWagered, 0);
  const globalBets = bettors.reduce((s, b) => s + b.totalBets, 0);
  const globalWins = bettors.reduce((s, b) => s + b.wins, 0);

  return (
    <>
      {/* Global Stats */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
          <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">TOTAL WAGERED</div>
          <div className="font-[var(--font-orbitron)] text-xl font-bold text-white">{globalWagered.toFixed(2)}</div>
          <div className="font-mono text-[10px] text-neutral-500 mt-1">SOL</div>
        </div>
        <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
          <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">TOTAL BETS</div>
          <div className="font-[var(--font-orbitron)] text-xl font-bold text-white">{globalBets}</div>
          <div className="font-mono text-[10px] text-neutral-500 mt-1">{bettors.length} wallets</div>
        </div>
        <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
          <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">BETS WON</div>
          <div className="font-[var(--font-orbitron)] text-xl font-bold text-emerald-400">{globalWins}</div>
          <div className="font-mono text-[10px] text-neutral-500 mt-1">{globalBets > 0 ? Math.round((globalWins / globalBets) * 100) : 0}% win rate</div>
        </div>
      </motion.div>

      {/* Refresh */}
      <motion.div
        className="flex justify-end mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={loadData}
          className="px-4 py-2 bg-black/60 border border-neutral-800 rounded-lg hover:border-amber-500/50 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} className="text-neutral-500" />
          <span className="font-[var(--font-orbitron)] text-xs text-neutral-400">Refresh</span>
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        className="bg-black/40 border border-neutral-800 rounded-lg overflow-hidden relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-black/60 border-b border-neutral-800">
          <div className="col-span-1">
            <SortButton field="rank" label="Rank" />
          </div>
          <div className="col-span-3 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500">
            Wallet
          </div>
          <div className="col-span-2 text-center">
            <SortButton field="totalBets" label="Bets" />
          </div>
          <div className="col-span-2 text-center">
            <SortButton field="winRate" label="Win %" />
          </div>
          <div className="col-span-2 text-center">
            <SortButton field="totalWagered" label="Wagered" />
          </div>
          <div className="col-span-2 text-center">
            <SortButton field="netPnl" label="P&L" />
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Coins size={48} className="text-amber-500/30 mx-auto mb-4" />
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
              No wagers have been placed yet. Be the first to test fate.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/50">
            {sorted.map((bettor, index) => {
              const rank = index + 1;
              return (
                <motion.div
                  key={bettor.wallet}
                  className={`grid grid-cols-12 gap-4 p-4 hover:bg-amber-500/5 transition-colors items-center ${getRowStyle(rank)}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  {/* Rank */}
                  <div className="col-span-2 md:col-span-1 flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold ${getRankStyle(rank)}`}>
                      {rank === 1 ? (
                        <Crown size={20} />
                      ) : rank <= 3 ? (
                        <Star size={18} />
                      ) : (
                        rank
                      )}
                    </div>
                  </div>

                  {/* Wallet */}
                  <div className="col-span-6 md:col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/60 border border-neutral-800 flex items-center justify-center">
                      <Coins size={18} className="text-amber-500/50" />
                    </div>
                    <div>
                      <div className="font-mono text-sm text-white" title={bettor.wallet}>
                        {shortenWallet(bettor.wallet)}
                      </div>
                      {getRankTitle(rank) && (
                        <p className="text-[10px] font-[var(--font-orbitron)] text-amber-500 tracking-[0.1em]">
                          {getRankTitle(rank)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bets W/L */}
                  <div className="hidden md:flex col-span-2 items-center justify-center">
                    <span className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                      <span className="text-emerald-500">{bettor.wins}</span>
                      {' / '}
                      <span className="text-red-500">{bettor.losses}</span>
                      {' / '}
                      <span className="text-white">{bettor.totalBets}</span>
                    </span>
                  </div>

                  {/* Win Rate */}
                  <div className="hidden md:flex col-span-2 items-center justify-center">
                    <span className={`font-[var(--font-orbitron)] font-bold ${
                      bettor.winRate >= 70 ? 'text-amber-500' : bettor.winRate >= 50 ? 'text-white' : 'text-neutral-500'
                    }`}>
                      {bettor.winRate.toFixed(0)}%
                    </span>
                  </div>

                  {/* Wagered */}
                  <div className="hidden md:flex col-span-2 items-center justify-center">
                    <span className="font-mono text-sm text-neutral-300">
                      {bettor.totalWagered.toFixed(2)}
                    </span>
                  </div>

                  {/* Net P&L */}
                  <div className="col-span-4 md:col-span-2 flex items-center justify-center">
                    <span className={`font-[var(--font-orbitron)] font-bold text-lg ${
                      bettor.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {bettor.netPnl >= 0 ? '+' : ''}{bettor.netPnl.toFixed(3)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
}
