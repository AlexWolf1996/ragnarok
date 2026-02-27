'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Coins, ExternalLink, Trophy, X, RefreshCw, Wallet } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getMatchBetsByWallet } from '@/lib/supabase/client';
import { lamportsToSol, BETTING_TIERS, BettingTier } from '@/lib/solana/transfer';
import { useToast } from '@/hooks/useToast';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CosmicBackground from '@/components/ui/CosmicBackground';

interface BetMatch {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  agent_a_id: string;
  agent_b_id: string;
  agent_a_score: number | null;
  agent_b_score: number | null;
  winner_id: string | null;
  bet_amount_lamports: number | null;
  bettor_wallet: string | null;
  bettor_pick_id: string | null;
  bet_tx_signature: string | null;
  bet_status: string | null;
  tier: string | null;
  payout_tx_signature: string | null;
  agent_a: { id: string; name: string } | null;
  agent_b: { id: string; name: string } | null;
}

const TIER_COLORS: Record<string, string> = {
  bifrost: 'text-emerald-400',
  midgard: 'text-amber-400',
  asgard: 'text-red-400',
};

const TIER_LABELS: Record<string, string> = {
  bifrost: 'BIFROST',
  midgard: 'MIDGARD',
  asgard: 'ASGARD',
};

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'paid':
      return { label: 'PAID', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'won':
      return { label: 'WON', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'lost':
      return { label: 'LOST', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    case 'payout_failed':
      return { label: 'PAYOUT PENDING', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    default:
      return { label: 'PENDING', color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' };
  }
}

function MyBetsContent() {
  const wallet = useWallet();
  const toast = useToast();
  const [bets, setBets] = useState<BetMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBets = useCallback(async () => {
    if (!wallet.publicKey) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getMatchBetsByWallet(wallet.publicKey.toString());
      setBets((data as BetMatch[]) || []);
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
  const wins = bets.filter((b) => b.bet_status === 'won' || b.bet_status === 'paid').length;
  const losses = bets.filter((b) => b.bet_status === 'lost').length;
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
  const totalWagered = bets.reduce(
    (sum, b) => sum + (b.bet_amount_lamports ? lamportsToSol(b.bet_amount_lamports) : 0),
    0,
  );
  const totalWon = bets
    .filter((b) => b.bet_status === 'paid' || b.bet_status === 'won')
    .reduce((sum, b) => {
      const amount = b.bet_amount_lamports ? lamportsToSol(b.bet_amount_lamports) : 0;
      return sum + amount * 1.9;
    }, 0);
  const netPnl = totalWon - totalWagered;

  // Not connected
  if (!wallet.connected || !wallet.publicKey) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center relative z-10 max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-black/60 border border-amber-600/30 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)' }}>
            <Wallet size={32} className="text-amber-500" />
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
          <Loader2 size={48} className="text-amber-500 animate-spin mx-auto mb-4" />
          <p className="font-[var(--font-orbitron)] text-sm text-amber-500/70 tracking-wider">CONSULTING THE NORNS...</p>
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
          <Coins size={48} className="text-amber-500 mx-auto mb-4 opacity-50" />
          <h2 className="font-[var(--font-orbitron)] text-xl text-white mb-2">FATE IS UNCLEAR</h2>
          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">{error}</p>
          <button
            onClick={loadBets}
            className="px-6 py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.15em] transition-all hover:border-amber-500 hover:text-amber-500"
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
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/60 border border-amber-600/30 flex items-center justify-center mx-auto mb-4 sm:mb-6" style={{ boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)' }}>
            <Coins size={28} className="text-amber-500 sm:hidden" />
            <Coins size={32} className="text-amber-500 hidden sm:block" />
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

        {/* Refresh */}
        <motion.div
          className="flex justify-end mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={loadBets}
            disabled={loading}
            className="px-4 py-2 bg-black/60 border border-neutral-800 rounded-lg hover:border-amber-500/50 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={`text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-[var(--font-orbitron)] text-xs text-neutral-400">Refresh</span>
          </button>
        </motion.div>

        {/* Bets List */}
        <motion.div
          className="bg-black/40 border border-neutral-800 rounded-lg overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

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

          {bets.length === 0 ? (
            <div className="p-12 text-center">
              <Coins size={48} className="text-amber-500/30 mx-auto mb-4" />
              <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                No wagers placed yet. Enter the arena and test your fate.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/50">
              {bets.map((bet, index) => {
                const badge = getStatusBadge(bet.bet_status);
                const amountSol = bet.bet_amount_lamports
                  ? lamportsToSol(bet.bet_amount_lamports)
                  : 0;
                const isWin = bet.bet_status === 'won' || bet.bet_status === 'paid';
                const pickedAgent =
                  bet.bettor_pick_id === bet.agent_a_id
                    ? bet.agent_a?.name
                    : bet.agent_b?.name;
                const winnerAgent =
                  bet.winner_id === bet.agent_a_id
                    ? bet.agent_a?.name
                    : bet.winner_id === bet.agent_b_id
                      ? bet.agent_b?.name
                      : null;
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
                    className="grid grid-cols-12 gap-4 p-4 hover:bg-amber-500/5 transition-colors items-center"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    {/* Match info */}
                    <div className="col-span-12 md:col-span-3">
                      <div className="font-[var(--font-rajdhani)] text-sm text-white">
                        {bet.agent_a?.name ?? '?'}{' '}
                        <span className="text-amber-500 font-[var(--font-orbitron)] text-[10px]">vs</span>{' '}
                        {bet.agent_b?.name ?? '?'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-neutral-500">
                          {dateStr} {timeStr}
                        </span>
                        {pickedAgent && (
                          <span className="font-mono text-[10px] text-neutral-600">
                            Picked: {pickedAgent}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tier */}
                    <div className="col-span-4 md:col-span-2 text-center">
                      <span
                        className={`font-[var(--font-orbitron)] text-xs tracking-wider ${
                          TIER_COLORS[bet.tier || ''] || 'text-neutral-400'
                        }`}
                      >
                        {TIER_LABELS[bet.tier || ''] || bet.tier || '-'}
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
                        ) : bet.bet_status === 'lost' ? (
                          <X size={12} className="text-red-400" />
                        ) : null}
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] font-[var(--font-orbitron)] tracking-wider ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        {isWin && (
                          <span className="font-mono text-[10px] text-emerald-400">
                            +{(amountSol * 1.9).toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tx links */}
                    <div className="col-span-12 md:col-span-3 flex items-center justify-center gap-3">
                      {bet.bet_tx_signature && (
                        <a
                          href={`https://solscan.io/tx/${bet.bet_tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-neutral-500 hover:text-amber-400 transition-colors"
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
                      {!bet.bet_tx_signature && !bet.payout_tx_signature && (
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
    <div className="bg-black/40 border border-neutral-800 rounded-lg p-3 sm:p-4 text-center">
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
