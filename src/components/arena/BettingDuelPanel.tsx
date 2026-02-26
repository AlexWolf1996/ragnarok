'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Swords, Loader2, Plus, Zap, Trophy, AlertTriangle, Check, X } from 'lucide-react';
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
  };
}

type BattleStep = 'select' | 'bet' | 'paying' | 'fighting' | 'result';

const TIER_LABELS: Record<BettingTier, string> = {
  bifrost: 'BIFROST',
  midgard: 'MIDGARD',
  asgard: 'ASGARD',
};

const TIER_COLORS: Record<BettingTier, string> = {
  bifrost: 'from-emerald-600 to-emerald-500',
  midgard: 'from-amber-600 to-amber-500',
  asgard: 'from-red-600 to-red-500',
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

  const handlePlaceBet = async () => {
    if (!canPlaceBet || !wallet.publicKey || !agentA || !agentB) return;

    setStep('paying');
    setError(null);
    onBattleStart?.();

    try {
      // Transfer SOL to treasury
      const transferResult = await transferToTreasury(wallet, selectedTier);

      if (!transferResult.success || !transferResult.signature) {
        throw new Error(transferResult.error || 'Payment failed');
      }

      setStep('fighting');

      // Execute battle with bet
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
      <div className="bg-black/40 border border-neutral-800 rounded-lg p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
        <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-6 flex items-center gap-2">
          <Plus size={16} className="text-amber-500" />
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
    <div className="bg-black/40 border border-neutral-800 rounded-lg p-6 relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          WAGE BATTLE
        </h2>
        {step !== 'select' && step !== 'fighting' && step !== 'paying' && (
          <button
            onClick={handleReset}
            className="text-xs text-neutral-500 hover:text-amber-500 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Select Agents */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
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

            <div className="flex items-center justify-center py-2">
              <span className="font-[var(--font-orbitron)] text-xs text-red-500 font-bold">VS</span>
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

            <div>
              <label className="block text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-[0.2em] mb-2">
                TRIAL BY
              </label>
              <select
                value={selectedChallenge}
                onChange={(e) => setSelectedChallenge(e.target.value)}
                className="w-full px-4 py-3 bg-black/60 border border-neutral-800 rounded-lg focus:outline-none focus:border-amber-500/50 font-[var(--font-rajdhani)] text-sm text-white"
              >
                <option value="random">The Norns Decide (Random)</option>
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.type?.replace(/_/g, ' ')} ({challenge.difficulty})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleProceedToBet}
              disabled={!canProceedToBet}
              className="w-full py-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
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
            <div className="flex items-center justify-between gap-4 p-4 bg-black/40 rounded-lg border border-neutral-800">
              <div className="text-center flex-1">
                <div className="text-2xl mb-1">{agentA.avatar_url || '⚔️'}</div>
                <div className="font-[var(--font-orbitron)] text-xs text-white truncate">{agentA.name}</div>
                <div className="font-mono text-[10px] text-neutral-500">{agentA.elo_rating} ELO</div>
                {odds && (
                  <div className="font-mono text-xs text-amber-500 mt-1">{odds.agentA}%</div>
                )}
              </div>
              <div className="font-[var(--font-orbitron)] text-red-500 text-sm font-bold">VS</div>
              <div className="text-center flex-1">
                <div className="text-2xl mb-1">{agentB.avatar_url || '⚔️'}</div>
                <div className="font-[var(--font-orbitron)] text-xs text-white truncate">{agentB.name}</div>
                <div className="font-mono text-[10px] text-neutral-500">{agentB.elo_rating} ELO</div>
                {odds && (
                  <div className="font-mono text-xs text-cyan-500 mt-1">{odds.agentB}%</div>
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
                    className={`py-3 px-2 rounded-lg border font-[var(--font-orbitron)] text-xs transition-all ${
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
                BET ON VICTOR
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBettorPick('A')}
                  className={`py-4 px-3 rounded-lg border transition-all ${
                    bettorPick === 'A'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                      : 'border-neutral-700 text-neutral-400 hover:border-amber-500/50'
                  }`}
                >
                  <div className="text-xl mb-1">{agentA.avatar_url || '⚔️'}</div>
                  <div className="font-[var(--font-orbitron)] text-xs truncate">{agentA.name}</div>
                </button>
                <button
                  onClick={() => setBettorPick('B')}
                  className={`py-4 px-3 rounded-lg border transition-all ${
                    bettorPick === 'B'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500'
                      : 'border-neutral-700 text-neutral-400 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-xl mb-1">{agentB.avatar_url || '⚔️'}</div>
                  <div className="font-[var(--font-orbitron)] text-xs truncate">{agentB.name}</div>
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <span className="font-[var(--font-rajdhani)] text-xs text-red-400">{error}</span>
              </div>
            )}

            {/* Wallet Warning */}
            {!wallet.connected && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <span className="font-[var(--font-rajdhani)] text-xs text-amber-400">
                  Connect your wallet to place bets
                </span>
              </div>
            )}

            {/* Place Bet Button */}
            <button
              onClick={handlePlaceBet}
              disabled={!canPlaceBet}
              className="w-full py-4 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:from-red-600 hover:via-red-500 hover:to-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
            >
              <Zap size={16} />
              WAGE {BETTING_TIERS[selectedTier]} SOL
            </button>

            <p className="font-mono text-[10px] text-neutral-600 text-center">
              Win = 1.9x payout • 5% platform fee
            </p>
          </motion.div>
        )}

        {/* STEP 3: Payment Processing */}
        {step === 'paying' && (
          <motion.div
            key="paying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-12 text-center"
          >
            <Loader2 size={32} className="text-amber-500 animate-spin mx-auto mb-4" />
            <p className="font-[var(--font-orbitron)] text-sm text-white tracking-wider mb-2">
              CONFIRM IN WALLET
            </p>
            <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400">
              Approve the {BETTING_TIERS[selectedTier]} SOL transfer to proceed...
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
            <div className={`p-4 rounded-lg border ${
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
                        +{battleResult.bet.potentialPayout.toFixed(3)} SOL (pending payout)
                      </div>
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
            <div className="p-4 bg-black/40 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <div className="text-xl mb-1">{agentA.avatar_url || '⚔️'}</div>
                  <div className={`font-[var(--font-orbitron)] text-xs ${battleResult.battle.agentA.isWinner ? 'text-amber-500' : 'text-neutral-400'}`}>
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
                  <div className={`font-[var(--font-orbitron)] text-xs ${battleResult.battle.agentB.isWinner ? 'text-amber-500' : 'text-neutral-400'}`}>
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
                <div className="text-[10px] font-[var(--font-orbitron)] text-cyan-500/70 tracking-wider mb-1">
                  JUDGE VERDICT
                </div>
                <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 line-clamp-3">
                  {battleResult.battle.reasoning}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleFightAgain}
                className="py-3 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white font-[var(--font-orbitron)] text-xs tracking-[0.1em] rounded-lg hover:from-amber-600 hover:via-amber-500 hover:to-amber-600 transition-all"
              >
                REMATCH
              </button>
              <button
                onClick={handleReset}
                className="py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-xs tracking-[0.1em] rounded-lg hover:border-neutral-500 hover:text-white transition-all"
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
