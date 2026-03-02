'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Coins, ExternalLink, Trophy, X, RefreshCw, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getMatchBetsByWallet } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CosmicBackground from '@/components/ui/CosmicBackground';

interface BetEntry {
  id: string;
  match_id: string;
  agent_id: string;
  amount_sol: number;
  status: string;
  tx_signature: string | null;
  payout_tx_signature: string | null;
  payout_sol: number | null;
  created_at: string;
  match: {
    id: string;
    status: string;
    winner_id: string | null;
    completed_at: string | null;
    agent_a_id: string;
    agent_b_id: string;
    agent_a: { id: string; name: string } | null;
    agent_b: { id: string; name: string } | null;
  } | null;
  picked_agent: { id: string; name: string } | null;
}

/** Derive tier from SOL amount */
function getTier(sol: number): { label: string; color: string } {
  if (sol >= 0.1) return { label: 'ASGARD', color: 'text-red-400' };
  if (sol >= 0.05) return { label: 'MIDGARD', color: 'text-[#D4A843]' };
  return { label: 'BIFROST', color: 'text-emerald-400' };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'won':
      return { label: 'WON', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'lost':
      return { label: 'LOST', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    case 'refunded':
      return { label: 'REFUNDED', color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' };
    default:
      return { label: 'ACTIVE', color: 'bg-[#c9a84c]/20 text-[#D4A843] border-[#c9a84c]/30' };
  }
}

function MyBetsContent() {
  const wallet = useWallet();
  const toast = useToast();
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');

  const loadBets = useCallback(async () => {
    if (!wallet.publicKey) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getMatchBetsByWallet(wallet.publicKey.toString());
      setBets((data as BetEntry[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load bets';
      setError(msg);
      toast.error('Load Failed', msg);
    } finally {
      setLoading(false);
    }
  }, [wallet.publicKey, toast]);

  useEffect(() => {
    if (wallet.publicKey) {
      loadBets();
    } else {
      setBets([]);
    }
  }, [wallet.publicKey, loadBets]);

  // Stats
  const totalBets = bets.length;
  const wins = bets.filter((b) => b.status === 'won').length;
  const losses = bets.filter((b) => b.status === 'lost').length;
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
  const totalWagered = bets.reduce((sum, b) => sum + (b.amount_sol || 0), 0);
  const totalWon = bets
    .filter((b) => b.status === 'won')
    .reduce((sum, b) => sum + (b.payout_sol ?? b.amount_sol ?? 0), 0);
  const netPnl = totalWon - totalWagered;

  // Filter bets
  const filteredBets = bets.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'won') return b.status === 'won';
    if (filter === 'lost') return b.status === 'lost';
    return b.status === 'pending';
  });

  const pendingCount = bets.filter((b) => b.status === 'pending').length;

  // Not connected
  if (!wallet.connected || !wallet.publicKey) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center relative z-10 max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-black/60 border border-[#c9a84c]/30 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)' }}>
            <Wallet size={32} className="text-[#c9a84c]" />
          </div>
          <h1 className="font-[var(--font-orbitron)] text-2xl text-white tracking-wider mb-4" style={{ textShadow: '0 0 30px rgba(220, 38, 38, 0.3)' }}>
            CONNECT YOUR WALLET
          </h1>
          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
            Link your Solana wallet to view your betting history and track your victories.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading && bets.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center relative z-10">
          <Loader2 size={48} className="text-[#c9a84c] animate-spin mx-auto mb-4" />
          <p className="font-[var(--font-orbitron)] text-sm text-[#c9a84c]/70 tracking-wider">CONSULTING THE NORNS...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error && bets.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center max-w-md p-8 relative z-10">
          <Coins size={48} className="text-[#c9a84c] mx-auto mb-4 opacity-50" />
          <h2 className="font-[var(--font-orbitron)] text-xl text-white mb-2">FATE IS UNCLEAR</h2>
          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">{error}</p>
          <button
            onClick={loadBets}
            className="px-6 py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.15em] transition-all hover:border-[#c9a84c] hover:text-[#c9a84c]"
          >
            <RefreshCw size={14} className="inline mr-2" />
            TRY AGAIN
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/60 border border-[#c9a84c]/30 flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)' }}>
            <Coins size={28} className="text-[#c9a84c] sm:hidden" />
            <Coins size={32} className="text-[#c9a84c] hidden sm:block" />
          </div>

          <div className="font-mono text-[10px] tracking-[0.35em] text-[#c9a84c]/70 mb-2">
            {'// WAR CHEST'}
          </div>
          <h1 className="font-[var(--font-orbitron)] text-2xl sm:text-3xl md:text-4xl tracking-[0.15em] text-white font-bold mb-3 sm:mb-4" style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}>
            MY WAGERS
          </h1>

          <p className="font-[var(--font-rajdhani)] text-lg text-neutral-400 max-w-2xl mx-auto">
            Every wager placed, every fate decided. The Norns remember all.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard label="TOTAL BETS" value={totalBets.toString()} />
          <StatCard label="WIN RATE" value={`${winRate}%`} sub={`${wins}W / ${losses}L`} />
          <StatCard label="WAGERED" value={`${totalWagered.toFixed(2)}`} sub="SOL" />
          <StatCard
            label="NET P&L"
            value={`${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(3)}`}
            sub="SOL"
            color={netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </motion.div>

        {/* Filter tabs + Refresh */}
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-1">
            {([
              { key: 'all' as const, label: 'ALL', count: totalBets },
              { key: 'pending' as const, label: 'PENDING', count: pendingCount },
              { key: 'won' as const, label: 'WON', count: wins },
              { key: 'lost' as const, label: 'LOST', count: losses },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-colors ${
                  filter === tab.key
                    ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="text-[9px] opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>
          <button
            onClick={loadBets}
            disabled={loading}
            className="px-4 py-2 bg-black/60 border border-neutral-800 hover:border-[#c9a84c]/50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={`text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-[var(--font-orbitron)] text-xs text-neutral-400">Refresh</span>
          </button>
        </motion.div>

        {/* Bets List */}
        <motion.div
          className="bg-black/40 border border-neutral-800 rounded-sm overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-black/60 border-b border-neutral-800">
            <div className="col-span-3 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500">
              Match
            </div>
            <div className="col-span-2 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500 text-center">
              Tier
            </div>
            <div className="col-span-2 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500 text-center">
              Wager
            </div>
            <div className="col-span-2 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500 text-center">
              Result
            </div>
            <div className="col-span-3 text-[10px] font-[var(--font-orbitron)] uppercase tracking-[0.2em] text-neutral-500 text-center">
              Tx
            </div>
          </div>

          {filteredBets.length === 0 ? (
            <div className="p-12 text-center">
              <Coins size={48} className="text-[#c9a84c]/30 mx-auto mb-4" />
              <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                {bets.length === 0 ? 'No wagers placed yet. Enter the arena and test your fate.' : `No ${filter} bets found.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/50">
              {filteredBets.map((bet, index) => {
                const badge = getStatusBadge(bet.status);
                const amountSol = bet.amount_sol;
                const isWin = bet.status === 'won';
                const tier = getTier(amountSol);
                const pickedAgentName = bet.picked_agent?.name;
                const date = new Date(bet.created_at);
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                const timeStr = date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <motion.div
                    key={bet.id}
                    className="grid grid-cols-12 gap-4 p-4 hover:bg-[#c9a84c]/5 transition-colors items-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    {/* Match info */}
                    <div className="col-span-12 md:col-span-3">
                      <div className="font-[var(--font-rajdhani)] text-sm text-white">
                        {bet.match?.agent_a?.name ?? '?'}{' '}
                        <span className="text-[#c9a84c] font-[var(--font-orbitron)] text-[10px]">vs</span>{' '}
                        {bet.match?.agent_b?.name ?? '?'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-neutral-500">
                          {dateStr} {timeStr}
                        </span>
                        {pickedAgentName && (
                          <span className="font-mono text-[10px] text-neutral-600">
                            Picked: {pickedAgentName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tier */}
                    <div className="col-span-4 md:col-span-2 text-center">
                      <span
                        className={`font-[var(--font-orbitron)] text-xs tracking-wider ${tier.color}`}
                      >
                        {tier.label}
                      </span>
                    </div>

                    {/* Wager */}
                    <div className="col-span-4 md:col-span-2 text-center">
                      <span className="font-mono text-sm text-white">
                        {amountSol.toFixed(amountSol < 0.1 ? 3 : 2)}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-500 ml-1">SOL</span>
                    </div>

                    {/* Result */}
                    <div className="col-span-4 md:col-span-2 flex justify-center">
                      <div className="flex items-center gap-2">
                        {isWin ? (
                          <Trophy size={12} className="text-emerald-400" />
                        ) : bet.status === 'lost' ? (
                          <X size={12} className="text-red-400" />
                        ) : null}
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-[var(--font-orbitron)] tracking-wider ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Tx links */}
                    <div className="col-span-12 md:col-span-3 flex items-center justify-center gap-3">
                      {bet.tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${bet.tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-neutral-500 hover:text-[#D4A843] transition-colors"
                        >
                          bet <ExternalLink size={10} />
                        </a>
                      )}
                      {bet.payout_tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${bet.payout_tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-500/70 hover:text-emerald-400 transition-colors"
                        >
                          payout <ExternalLink size={10} />
                        </a>
                      )}
                      {!bet.tx_signature && !bet.payout_tx_signature && (
                        <span className="font-mono text-[10px] text-neutral-600">-</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.p
          className="text-center font-[var(--font-rajdhani)] text-sm text-neutral-500 tracking-wider mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          THE NORNS WEAVE YOUR FATE WITH EVERY WAGER
        </motion.p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-black/40 border border-neutral-800 rounded-sm p-3 sm:p-4 text-center hover:border-[#c9a84c]/30 transition-all">
      <div className="text-[9px] sm:text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.15em] sm:tracking-[0.2em] mb-1 sm:mb-2">
        {label}
      </div>
      <div className={`font-[var(--font-orbitron)] text-lg sm:text-xl font-bold ${color || 'text-white'}`}>
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[10px] text-neutral-500 mt-1">{sub}</div>
      )}
    </div>
  );
}

export default function MyBetsPage() {
  return (
    <ErrorBoundary>
      <MyBetsContent />
    </ErrorBoundary>
  );
}
