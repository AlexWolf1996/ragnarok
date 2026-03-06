'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Swords, Loader2, Plus, Zap, Trophy, AlertTriangle, Check, X, ExternalLink } from 'lucide-react';
import AgentSelector from '@/components/ui/AgentSelector';
import { Tables } from '@/lib/supabase/types';
import { BETTING_TIERS, BettingTier, transferToTreasury } from '@/lib/solana/transfer';

type Agent = Tables<'agents'>;
type Challenge = Tables<'challenges'>;

interface BettingDuelPanelProps {
  agents: Agent[];
  challenges: Challenge[];
  onBattleComplete: (result: BattleResult) => void;
  onBattleStart?: () => void;
}

interface BattleResult {
  matchId: string;
  bet: {
    tier: BettingTier;
    amountSol: number;
    pickedAgent: string;
    won: boolean;
    potentialPayout: number;
    payoutSol?: number;
    payoutTxSignature?: string | null;
    payoutStatus?: string;
  };
  battle: {
    agentA: {
      id: string;
      name: string;
      score: number;
      eloDelta: number;
      isWinner: boolean;
      response: string;
    };
    agentB: {
      id: string;
      name: string;
      score: number;
      eloDelta: number;
      isWinner: boolean;
      response: string;
    };
    challenge: {
      id: string;
      name: string;
      type: string;
      difficulty: string;
      prompt: string;
    };
    winner: { id: string; name: string };
    loser: { id: string; name: string };
    reasoning: string;
    judges?: {
      judgeId: string;
      judgeName: string;
      model: string;
      scoreA: number;
      scoreB: number;
      winnerId: 'A' | 'B' | 'TIE';
      reasoning: string;
      failed: boolean;
    }[];
    isSplitDecision?: boolean;
    isUnanimous?: boolean;
  };
}

type BattleStep = 'select' | 'bet' | 'paying' | 'verifying' | 'fighting' | 'result';

const TIER_LABELS: Record<BettingTier, string> = {
  bifrost: 'BIFROST',
  midgard: 'MIDGARD',
  asgard: 'ASGARD',
};

const TIER_COLORS: Record<BettingTier, string> = {
  bifrost: 'from-[#8a6d2b] to-[#a88a3d]',
  midgard: 'from-[#a88a3d] to-[#c9a84c]',
  asgard: 'from-red-600 to-red-500',
};

const CATEGORY_META: Record<string, { icon: string; color: string; border: string }> = {
  reasoning: { icon: '🧠', color: 'text-[#D4A843]', border: 'border-[#c9a84c]/30 bg-[#c9a84c]/10' },
  creative: { icon: '🎨', color: 'text-red-400', border: 'border-red-500/30 bg-red-500/10' },
  strategy: { icon: '♟️', color: 'text-orange-400', border: 'border-orange-500/30 bg-orange-500/10' },
  code: { icon: '💻', color: 'text-yellow-400', border: 'border-yellow-500/30 bg-yellow-500/10' },
  knowledge: { icon: '📚', color: 'text-rose-400', border: 'border-rose-500/30 bg-rose-500/10' },
};

export default function BettingDuelPanel({
  agents,
  challenges,
  onBattleComplete,
  onBattleStart,
}: BettingDuelPanelProps) {
  const wallet = useWallet();
  const { connection } = useConnection();

  // Selection state
  const [agentA, setAgentA] = useState<Agent | null>(null);
  const [agentB, setAgentB] = useState<Agent | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('random');
  const [selectedTier, setSelectedTier] = useState<BettingTier>('midgard');
  const [bettorPick, setBettorPick] = useState<'A' | 'B' | null>(null);

  // Battle state
  const [step, setStep] = useState<BattleStep>('select');
  const [error, setError] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  // Handle wallet disconnect during payment flow
  useEffect(() => {
    if (!wallet.connected && (step === 'paying' || step === 'verifying')) {
      setStep('bet');
      setError('Wallet disconnected. Please reconnect and try again.');
    }
  }, [wallet.connected, step]);

  // Head-to-head record
  const [h2h, setH2h] = useState<{ aWins: number; bWins: number } | null>(null);

  useEffect(() => {
    if (!agentA || !agentB) {
      setH2h(null);
      return;
    }

    async function fetchH2H() {
      try {
        const res = await fetch(`/api/battles/history?limit=100&status=completed`);
        const data = await res.json();
        const matches = data.matches || [];
        let aWins = 0;
        let bWins = 0;
        for (const m of matches) {
          const isMatchup =
            (m.agentA.id === agentA!.id && m.agentB.id === agentB!.id) ||
            (m.agentA.id === agentB!.id && m.agentB.id === agentA!.id);
          if (!isMatchup || !m.winner) continue;
          if (m.winner.id === agentA!.id) aWins++;
          else if (m.winner.id === agentB!.id) bWins++;
        }
        setH2h({ aWins, bWins });
      } catch {
        setH2h(null);
      }
    }

    fetchH2H();
  }, [agentA, agentB]);

  // Calculate expected value based on ELO
  const odds = useMemo(() => {
    if (!agentA || !agentB) return null;
    const eloA = agentA.elo_rating;
    const eloB = agentB.elo_rating;
    const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
    const expectedB = 1 - expectedA;
    return {
      agentA: Math.round(expectedA * 100),
      agentB: Math.round(expectedB * 100),
    };
  }, [agentA, agentB]);

  const canProceedToBet = agentA && agentB && agentA.id !== agentB.id;
  const canPlaceBet = canProceedToBet && bettorPick && wallet.connected;

  const handleProceedToBet = () => {
    if (canProceedToBet) {
      setStep('bet');
      setError(null);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceBet = async () => {
    if (!canPlaceBet || !wallet.publicKey || !agentA || !agentB || isSubmitting) return;

    setIsSubmitting(true);
    setStep('paying');
    setError(null);
    onBattleStart?.();

    try {
      // Transfer SOL to treasury using the connection from WalletProvider
      const transferResult = await transferToTreasury(wallet, BETTING_TIERS[selectedTier], connection);

      if (!transferResult.success || !transferResult.signature) {
        throw new Error(transferResult.error || 'Payment failed');
      }

      // Show verifying state while backend confirms transaction
      setStep('verifying');

      // Send signature to backend for verification + battle execution
      const response = await fetch('/api/battles/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAId: agentA.id,
          agentBId: agentB.id,
          bettorWallet: wallet.publicKey.toString(),
          bettorPickId: bettorPick === 'A' ? agentA.id : agentB.id,
          tier: selectedTier,
          txSignature: transferResult.signature,
          challengeId: selectedChallenge === 'random' ? undefined : selectedChallenge,
        }),
      });

      // Backend verified, now show fighting
      setStep('fighting');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Battle failed');
      }

      setBattleResult(data);
      setStep('result');
      onBattleComplete(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setStep('bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAgentA(null);
    setAgentB(null);
    setSelectedChallenge('random');
    setSelectedTier('midgard');
    setBettorPick(null);
    setStep('select');
    setError(null);
    setBattleResult(null);
  };

  const handleFightAgain = () => {
    setBettorPick(null);
    setStep('bet');
    setBattleResult(null);
    setError(null);
  };

  if (agents.length < 2) {
    return (
      <div className="bg-black/40 border border-neutral-800 rounded-sm p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
        <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-6 flex items-center gap-2">
          <Plus size={16} className="text-[#c9a84c]" />
          WAGE BATTLE
        </h2>
        <div className="text-center py-8">
          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-4">
            The arena requires at least 2 champions.
          </p>
          <a href="/register" className="inline-block px-6 py-2 border border-red-600 text-red-500 font-[var(--font-orbitron)] text-xs tracking-[0.2em] transition-all hover:bg-red-500 hover:text-white">
            FORGE YOUR CHAMPION
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-neutral-800 rounded-sm p-6 relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white flex items-center gap-2">
          <Zap size={16} className="text-[#c9a84c]" />
          WAGE BATTLE
        </h2>
        {step !== 'select' && step !== 'fighting' && step !== 'paying' && step !== 'verifying' && (
          <button
            onClick={handleReset}
            className="text-xs text-neutral-500 hover:text-[#c9a84c] transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Select Challenge + Agents */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Challenge category selection — shown FIRST */}
            <div>
              <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
                TRIAL BY COMBAT
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-1">
                <button
                  onClick={() => setSelectedChallenge('random')}
                  className={`py-2.5 px-2 rounded-sm border text-center transition-all ${
                    selectedChallenge === 'random'
                      ? 'border-[#c9a84c] bg-[#c9a84c]/10 text-[#D4A843]'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  <div className="text-lg mb-0.5">🎲</div>
                  <div className="font-[var(--font-orbitron)] text-[9px] tracking-wider">RANDOM</div>
                </button>
                {Object.entries(CATEGORY_META).map(([type, meta]) => (
                  <button
                    key={type}
                    onClick={() => {
                      // Find a random challenge of this type
                      const matching = challenges.filter(c => c.type === type);
                      if (matching.length > 0) {
                        const pick = matching[Math.floor(Math.random() * matching.length)];
                        setSelectedChallenge(pick.id);
                      }
                    }}
                    className={`py-2.5 px-2 rounded-sm border text-center transition-all ${
                      selectedChallenge !== 'random' && challenges.find(c => c.id === selectedChallenge)?.type === type
                        ? `${meta.border} ${meta.color}`
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{meta.icon}</div>
                    <div className="font-[var(--font-orbitron)] text-[9px] tracking-wider">
                      {type.toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent selection */}
            <div>
              <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
                FIRST WARRIOR
              </label>
              <AgentSelector
                agents={agents}
                selectedAgent={agentA}
                onSelect={setAgentA}
                placeholder="Select first agent"
                excludeAgentId={agentB?.id}
              />
            </div>

            <div className="flex items-center justify-center py-2 gap-3">
              <span className="font-[var(--font-orbitron)] text-xs text-red-500 font-bold">VS</span>
              {h2h && (h2h.aWins > 0 || h2h.bWins > 0) && (
                <span className="font-mono text-[10px] text-neutral-500">
                  H2H: {h2h.aWins}-{h2h.bWins}
                </span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
                SECOND WARRIOR
              </label>
              <AgentSelector
                agents={agents}
                selectedAgent={agentB}
                onSelect={setAgentB}
                placeholder="Select second agent"
                excludeAgentId={agentA?.id}
              />
            </div>

            <button
              onClick={handleProceedToBet}
              disabled={!canProceedToBet}
              className="w-full py-4 bg-gradient-to-r from-[#8a6d2b] via-[#a88a3d] to-[#8a6d2b] text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:from-[#a88a3d] hover:via-[#c9a84c] hover:to-[#a88a3d] shadow-[0_0_30px_rgba(245,158,11,0.3)]"
            >
              <Swords size={16} />
              PLACE YOUR WAGER
            </button>
          </motion.div>
        )}

        {/* STEP 2: Place Bet */}
        {step === 'bet' && agentA && agentB && (
          <motion.div
            key="bet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Matchup Display */}
            <div className="flex items-center justify-between gap-4 p-4 bg-black/40 rounded-sm border border-neutral-800">
              <div className="text-center flex-1">
                <div className="text-2xl mb-1">{agentA.avatar_url || '⚔️'}</div>
                <div className="font-[var(--font-orbitron)] text-xs text-white truncate">{agentA.name}</div>
                <div className="font-mono text-[10px] text-neutral-500">{agentA.elo_rating} ELO</div>
                {odds && (
                  <div className="font-mono text-xs text-[#c9a84c] mt-1">{odds.agentA}%</div>
                )}
              </div>
              <div className="text-center">
                <div className="font-[var(--font-orbitron)] text-red-500 text-sm font-bold">VS</div>
                {h2h && (h2h.aWins > 0 || h2h.bWins > 0) && (
                  <div className="font-mono text-[9px] text-neutral-500 mt-0.5">
                    H2H: {h2h.aWins}-{h2h.bWins}
                  </div>
                )}
              </div>
              <div className="text-center flex-1">
                <div className="text-2xl mb-1">{agentB.avatar_url || '⚔️'}</div>
                <div className="font-[var(--font-orbitron)] text-xs text-white truncate">{agentB.name}</div>
                <div className="font-mono text-[10px] text-neutral-500">{agentB.elo_rating} ELO</div>
                {odds && (
                  <div className="font-mono text-xs text-red-500 mt-1">{odds.agentB}%</div>
                )}
              </div>
            </div>

            {/* Tier Selection */}
            <div>
              <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
                STAKE TIER
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(BETTING_TIERS) as BettingTier[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`py-3 px-2 rounded-sm border font-[var(--font-orbitron)] text-xs transition-all ${
                      selectedTier === tier
                        ? `bg-gradient-to-r ${TIER_COLORS[tier]} border-transparent text-white`
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    <div>{TIER_LABELS[tier]}</div>
                    <div className="font-mono text-[10px] mt-1">{BETTING_TIERS[tier]} SOL</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pick Winner */}
            <div>
              <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
                CHOOSE YOUR CHAMPION
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBettorPick('A')}
                  className={`py-4 px-3 rounded-sm border transition-all ${
                    bettorPick === 'A'
                      ? 'bg-[#c9a84c]/20 border-[#c9a84c] text-[#c9a84c]'
                      : 'border-neutral-700 text-neutral-400 hover:border-[#c9a84c]/50'
                  }`}
                >
                  <div className="text-xl mb-1">{agentA.avatar_url || '⚔️'}</div>
                  <div className="font-[var(--font-orbitron)] text-xs truncate">{agentA.name}</div>
                </button>
                <button
                  onClick={() => setBettorPick('B')}
                  className={`py-4 px-3 rounded-sm border transition-all ${
                    bettorPick === 'B'
                      ? 'bg-red-500/20 border-red-500 text-red-500'
                      : 'border-neutral-700 text-neutral-400 hover:border-red-500/50'
                  }`}
                >
                  <div className="text-xl mb-1">{agentB.avatar_url || '⚔️'}</div>
                  <div className="font-[var(--font-orbitron)] text-xs truncate">{agentB.name}</div>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <span className="font-[var(--font-rajdhani)] text-xs text-red-400">{error}</span>
              </div>
            )}

            {/* Wallet Warning */}
            {!wallet.connected && (
              <div className="p-3 bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#c9a84c] flex-shrink-0" />
                <span className="font-[var(--font-rajdhani)] text-xs text-[#D4A843]">
                  Connect your wallet to stake prophecies
                </span>
              </div>
            )}

            {/* Place Bet Button */}
            <button
              onClick={handlePlaceBet}
              disabled={!canPlaceBet}
              className="w-full py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:from-red-600 hover:via-red-500 hover:to-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
            >
              <Zap size={16} />
              WAGE {BETTING_TIERS[selectedTier]} SOL
            </button>

            <p className="font-mono text-[10px] text-neutral-600 text-center">
              Parimutuel odds • 5% platform fee
            </p>
          </motion.div>
        )}

        {/* STEP 3: Payment Processing - Wallet Popup */}
        {step === 'paying' && (
          <motion.div
            key="paying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center"
          >
            <Loader2 size={32} className="text-[#c9a84c] animate-spin mx-auto mb-4" />
            <p className="font-[var(--font-orbitron)] text-sm text-white tracking-wider mb-2">
              CONFIRM IN WALLET
            </p>
            <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400">
              Approve the {BETTING_TIERS[selectedTier]} SOL transfer to proceed...
            </p>
          </motion.div>
        )}

        {/* STEP 3.5: Verifying Payment on Chain */}
        {step === 'verifying' && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center"
          >
            <div className="relative inline-block">
              <Check size={32} className="text-emerald-500 mx-auto mb-4" />
              <motion.div
                className="absolute -inset-2"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-full h-full border-2 border-emerald-500 rounded-full" />
              </motion.div>
            </div>
            <p className="font-[var(--font-orbitron)] text-sm text-white tracking-wider mb-2">
              VERIFYING PAYMENT...
            </p>
            <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400">
              Confirming your transaction on Solana...
            </p>
          </motion.div>
        )}

        {/* STEP 4: Battle in Progress */}
        {step === 'fighting' && (
          <motion.div
            key="fighting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center"
          >
            <div className="relative">
              <Swords size={48} className="text-red-500 mx-auto mb-4 animate-pulse" />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-16 h-16 border-2 border-red-500/30 border-t-red-500 rounded-full" />
              </motion.div>
            </div>
            <p className="font-[var(--font-orbitron)] text-sm text-white tracking-wider mb-2">
              BATTLE IN PROGRESS
            </p>
            <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400">
              The gods are watching. Fate is being decided...
            </p>
          </motion.div>
        )}

        {/* STEP 5: Result */}
        {step === 'result' && battleResult && agentA && agentB && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* Win/Lose Banner */}
            <div className={`p-4 rounded-sm border ${
              battleResult.bet.won
                ? 'bg-emerald-500/20 border-emerald-500'
                : 'bg-red-500/20 border-red-500'
            }`}>
              <div className="flex items-center justify-center gap-3">
                {battleResult.bet.won ? (
                  <>
                    <Trophy size={24} className="text-emerald-400" />
                    <div>
                      <div className="font-[var(--font-orbitron)] text-lg text-emerald-400 tracking-wider">
                        VICTORY!
                      </div>
                      <div className="font-mono text-xs text-emerald-300">
                        +{battleResult.bet.potentialPayout.toFixed(3)} SOL
                        {battleResult.bet.payoutStatus === 'paid' ? ' sent' : ' (payout pending)'}
                      </div>
                      {battleResult.bet.payoutTxSignature && (
                        <a
                          href={`https://solscan.io/tx/${battleResult.bet.payoutTxSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400/70 hover:text-emerald-300 transition-colors mt-1"
                        >
                          View payout tx <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <X size={24} className="text-red-400" />
                    <div>
                      <div className="font-[var(--font-orbitron)] text-lg text-red-400 tracking-wider">
                        DEFEAT
                      </div>
                      <div className="font-mono text-xs text-red-300">
                        -{battleResult.bet.amountSol} SOL
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Battle Summary */}
            <div className="p-4 bg-black/40 rounded-sm border border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <div className="text-xl mb-1">{agentA.avatar_url || '⚔️'}</div>
                  <div className={`font-[var(--font-orbitron)] text-xs ${battleResult.battle.agentA.isWinner ? 'text-[#c9a84c]' : 'text-neutral-400'}`}>
                    {agentA.name}
                    {battleResult.battle.agentA.isWinner && <Trophy size={12} className="inline ml-1" />}
                  </div>
                  <div className="font-mono text-lg text-white">{battleResult.battle.agentA.score}</div>
                  <div className={`font-mono text-[10px] ${battleResult.battle.agentA.eloDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {battleResult.battle.agentA.eloDelta >= 0 ? '+' : ''}{battleResult.battle.agentA.eloDelta} ELO
                  </div>
                </div>
                <div className="font-[var(--font-orbitron)] text-neutral-600 text-xs">VS</div>
                <div className="text-center flex-1">
                  <div className="text-xl mb-1">{agentB.avatar_url || '⚔️'}</div>
                  <div className={`font-[var(--font-orbitron)] text-xs ${battleResult.battle.agentB.isWinner ? 'text-[#c9a84c]' : 'text-neutral-400'}`}>
                    {agentB.name}
                    {battleResult.battle.agentB.isWinner && <Trophy size={12} className="inline ml-1" />}
                  </div>
                  <div className="font-mono text-lg text-white">{battleResult.battle.agentB.score}</div>
                  <div className={`font-mono text-[10px] ${battleResult.battle.agentB.eloDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {battleResult.battle.agentB.eloDelta >= 0 ? '+' : ''}{battleResult.battle.agentB.eloDelta} ELO
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800">
                {battleResult.battle.judges && battleResult.battle.judges.length > 0 ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="text-[10px] font-[var(--font-orbitron)] text-[#c9a84c]/70 tracking-wider">
                        JUDGE PANEL
                      </div>
                      {battleResult.battle.isSplitDecision && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400 font-[var(--font-orbitron)] animate-pulse">
                          SPLIT
                        </span>
                      )}
                      {battleResult.battle.isUnanimous && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-[var(--font-orbitron)]">
                          UNANIMOUS
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2 max-sm:grid-cols-1">
                      {battleResult.battle.judges.map((judge) => (
                        <div
                          key={judge.judgeId}
                          className={`text-center p-1.5 rounded border ${
                            judge.failed
                              ? 'border-neutral-700 opacity-50'
                              : judge.judgeId === 'odin' ? 'border-[#c9a84c]/30 bg-[#c9a84c]/5'
                              : judge.judgeId === 'thor' ? 'border-blue-500/30 bg-blue-500/5'
                              : judge.judgeId === 'freya' ? 'border-pink-500/30 bg-pink-500/5'
                              : 'border-neutral-700'
                          }`}
                        >
                          <div className="text-[9px] font-[var(--font-orbitron)] text-neutral-400 mb-0.5">
                            {judge.judgeName}
                          </div>
                          {judge.failed ? (
                            <div className="text-[9px] text-neutral-600 font-mono">OFFLINE</div>
                          ) : (
                            <div className="font-mono text-xs font-bold">
                              <span className={judge.winnerId === 'A' ? 'text-[#D4A843]' : 'text-neutral-500'}>{judge.scoreA}</span>
                              <span className="text-neutral-600 mx-0.5">-</span>
                              <span className={judge.winnerId === 'B' ? 'text-red-400' : 'text-neutral-500'}>{judge.scoreB}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] font-[var(--font-orbitron)] text-[#c9a84c]/70 tracking-wider mb-1">
                    JUDGE VERDICT
                  </div>
                )}
                <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 line-clamp-3">
                  {battleResult.battle.reasoning}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleFightAgain}
                className="py-3 bg-gradient-to-r from-[#8a6d2b] via-[#a88a3d] to-[#8a6d2b] text-white font-[var(--font-orbitron)] text-xs tracking-[0.1em] rounded-sm hover:from-[#a88a3d] hover:via-[#c9a84c] hover:to-[#a88a3d] transition-all"
              >
                REMATCH
              </button>
              <button
                onClick={handleReset}
                className="py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-xs tracking-[0.1em] rounded-sm hover:border-neutral-500 hover:text-white transition-all"
              >
                NEW DUEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
