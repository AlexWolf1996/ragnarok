'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Swords, Scroll, Loader2, Trophy, ExternalLink } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getMatchBetsByWallet } from '@/lib/supabase/client';
import { lamportsToSol } from '@/lib/solana/transfer';
import MyChallenges from './MyChallenges';
import SubmitChallenge from './SubmitChallenge';

type Tab = 'bets' | 'challenges';

interface BetMatch {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  agent_a_id: string;
  agent_b_id: string;
  winner_id: string | null;
  bet_amount_lamports: number | null;
  bettor_pick_id: string | null;
  bet_tx_signature: string | null;
  bet_status: string | null;
  tier: string | null;
  payout_tx_signature: string | null;
  agent_a: { id: string; name: string } | null;
  agent_b: { id: string; name: string } | null;
}

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function ActivityDrawer({ open, onClose }: ActivityDrawerProps) {
  const [tab, setTab] = useState<Tab>('bets');

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            className="fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-[#0a0a0f] border-l border-[#1a1a1a] z-50 flex flex-col overflow-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
              <span className="font-[var(--font-orbitron)] text-xs tracking-[0.15em] text-white">
                MY ACTIVITY
              </span>
              <button
                onClick={onClose}
                className="p-1 text-neutral-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#1a1a1a]">
              <TabButton
                active={tab === 'bets'}
                onClick={() => setTab('bets')}
                icon={<Swords size={12} />}
                label="My Bets"
              />
              <TabButton
                active={tab === 'challenges'}
                onClick={() => setTab('challenges')}
                icon={<Scroll size={12} />}
                label="My Challenges"
              />
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'bets' ? <MyBetsTab /> : <MyChallenges />}
            </div>

            {/* Bottom: Submit Challenge (collapsible) */}
            <div className="border-t border-[#1a1a1a]">
              <SubmitChallenge />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Tab Button ───────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 font-mono text-[10px] tracking-widest uppercase transition-colors ${
        active
          ? 'text-[#c9a84c] border-b-2 border-[#c9a84c]'
          : 'text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── My Bets Tab ──────────────────────────────────────

function MyBetsTab() {
  const { publicKey, connected } = useWallet();
  const [bets, setBets] = useState<BetMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const wallet = publicKey?.toString() ?? null;

  const fetchBets = useCallback(async () => {
    if (!wallet) {
      setBets([]);
      return;
    }
    try {
      const data = await getMatchBetsByWallet(wallet);
      setBets((data as BetMatch[]) || []);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (!wallet) {
      setBets([]);
      return;
    }
    setLoading(true);
    fetchBets();
  }, [wallet, fetchBets]);

  if (!connected) {
    return (
      <div className="py-12 text-center">
        <Swords size={24} className="text-neutral-600 mx-auto mb-3" />
        <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
          Connect wallet to view bets
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 size={18} className="text-[#c9a84c] animate-spin" />
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="py-12 text-center">
        <Swords size={24} className="text-neutral-600 mx-auto mb-3" />
        <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
          No bets yet
        </p>
        <p className="font-mono text-[9px] text-neutral-600 mt-1">
          Place a prediction on the current match
        </p>
      </div>
    );
  }

  // Quick stats
  const wins = bets.filter((b) => b.bet_status === 'won' || b.bet_status === 'paid').length;
  const losses = bets.filter((b) => b.bet_status === 'lost').length;

  return (
    <div className="space-y-3">
      {/* Mini stats */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-neutral-500">{bets.length} bets</span>
          <span className="text-emerald-400">{wins}W</span>
          <span className="text-red-400">{losses}L</span>
        </div>
        <a
          href="/my-bets"
          className="font-mono text-[10px] text-[#c9a84c] hover:text-[#D4A843] tracking-widest uppercase transition-colors"
        >
          View All
        </a>
      </div>

      {/* Bet list */}
      {bets.slice(0, 20).map((bet) => (
        <BetHistoryCard key={bet.id} bet={bet} />
      ))}

      {bets.length > 20 && (
        <a
          href="/my-bets"
          className="block text-center py-3 font-mono text-[10px] text-[#c9a84c] hover:text-[#D4A843] tracking-widest uppercase transition-colors"
        >
          View all {bets.length} bets
        </a>
      )}
    </div>
  );
}

// ─── Bet History Card ─────────────────────────────────

const BET_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'ACTIVE', color: 'text-[#D4A843]' },
  won: { label: 'WON', color: 'text-emerald-400' },
  paid: { label: 'WON', color: 'text-emerald-400' },
  lost: { label: 'LOST', color: 'text-red-400' },
  refunded: { label: 'REFUNDED', color: 'text-neutral-400' },
};

const TIER_COLORS: Record<string, string> = {
  bifrost: 'text-emerald-400',
  midgard: 'text-[#D4A843]',
  asgard: 'text-red-400',
};

function BetHistoryCard({ bet }: { bet: BetMatch }) {
  const status = BET_STATUS_STYLES[bet.bet_status ?? 'pending'] ?? BET_STATUS_STYLES.pending;
  const isWin = bet.bet_status === 'won' || bet.bet_status === 'paid';
  const amountSol = bet.bet_amount_lamports ? lamportsToSol(bet.bet_amount_lamports) : 0;
  const pickedAgent = bet.bettor_pick_id === bet.agent_a_id
    ? bet.agent_a?.name
    : bet.agent_b?.name;

  const date = new Date(bet.created_at);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="border border-[#1a1a1a] bg-[#0d0d0d] p-3 space-y-2">
      {/* Match + status */}
      <div className="flex items-center justify-between">
        <div className="font-[var(--font-rajdhani)] text-xs text-white truncate mr-2">
          {bet.agent_a?.name ?? '?'}
          <span className="text-neutral-600 mx-1">vs</span>
          {bet.agent_b?.name ?? '?'}
        </div>
        <span className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase flex-shrink-0 ${status.color}`}>
          {isWin && <Trophy size={10} />}
          {status.label}
        </span>
      </div>

      {/* Details row */}
      <div className="flex items-center justify-between font-mono text-[9px]">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">{dateStr}</span>
          {bet.tier && (
            <span className={`tracking-wider uppercase ${TIER_COLORS[bet.tier] ?? 'text-neutral-400'}`}>
              {bet.tier}
            </span>
          )}
        </div>
        <span className="text-white text-[10px]">
          {amountSol.toFixed(amountSol < 0.1 ? 3 : 2)} SOL
        </span>
      </div>

      {/* Picked agent + tx links */}
      <div className="flex items-center justify-between font-mono text-[9px] text-neutral-600">
        {pickedAgent && <span>Picked: {pickedAgent}</span>}
        <div className="flex items-center gap-2 ml-auto">
          {bet.bet_tx_signature && (
            <a
              href={`https://solscan.io/tx/${bet.bet_tx_signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-neutral-500 hover:text-[#D4A843] transition-colors"
            >
              tx <ExternalLink size={8} />
            </a>
          )}
          {bet.payout_tx_signature && (
            <a
              href={`https://solscan.io/tx/${bet.payout_tx_signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-emerald-500/70 hover:text-emerald-400 transition-colors"
            >
              payout <ExternalLink size={8} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
