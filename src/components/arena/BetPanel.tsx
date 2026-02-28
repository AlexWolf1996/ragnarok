'use client';

import { useState } from 'react';
import { Swords, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { usePlaceBet } from '@/hooks/usePlaceBet';
import { useMatchOdds, calculateOdds } from '@/hooks/useMatchOdds';
import { transferToTreasury, BETTING_TIERS, BettingTier } from '@/lib/solana/transfer';
import { useToast } from '@/hooks/useToast';
import type { CurrentMatch } from '@/hooks/useCurrentMatch';
import PayoutPreview from './PayoutPreview';
import ParimutuelExplainer from './ParimutuelExplainer';

interface BetPanelProps {
  match: CurrentMatch | null;
  selectedSide: 'A' | 'B' | null;
}

const TIERS: { key: BettingTier; label: string; amount: number }[] = [
  { key: 'bifrost', label: 'BIFROST', amount: BETTING_TIERS.bifrost },
  { key: 'midgard', label: 'MIDGARD', amount: BETTING_TIERS.midgard },
  { key: 'asgard', label: 'ASGARD', amount: BETTING_TIERS.asgard },
];

export default function BetPanel({ match, selectedSide }: BetPanelProps) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const toast = useToast();
  const { placeBet, loading: placingBet, error: betError, success: betPlaced, reset } = usePlaceBet();
  const { poolA, poolB, oddsA, oddsB } = useMatchOdds(
    match?.id ?? null,
    match?.status ?? null,
  );

  const [selectedTier, setSelectedTier] = useState<BettingTier>('midgard');
  const [transferring, setTransferring] = useState(false);

  const isBettingOpen = match?.status === 'betting_open';
  const selectedAgent = selectedSide === 'A' ? match?.agentA : selectedSide === 'B' ? match?.agentB : null;
  const selectedAgentId = selectedSide === 'A' ? match?.agent_a_id : selectedSide === 'B' ? match?.agent_b_id : null;

  // Use live odds if available, otherwise fall back to match.odds
  const hasLiveOdds = poolA > 0 || poolB > 0;
  const displayOddsA = hasLiveOdds ? oddsA : (match?.odds?.oddsA ?? 2.0);
  const displayOddsB = hasLiveOdds ? oddsB : (match?.odds?.oddsB ?? 2.0);
  const displayPoolA = hasLiveOdds ? poolA : (match?.odds?.poolA ?? 0);
  const displayPoolB = hasLiveOdds ? poolB : (match?.odds?.poolB ?? 0);

  const currentOdds = selectedSide === 'A' ? displayOddsA : displayOddsB;
  const betAmount = BETTING_TIERS[selectedTier];

  const isLoading = transferring || placingBet;

  const handlePlaceBet = async () => {
    if (!match || !selectedAgentId || !wallet.publicKey || !wallet.connected) return;

    setTransferring(true);
    try {
      // Step 1: Transfer SOL to treasury
      toast.info('Payment', `Sending ${betAmount} SOL to treasury...`);
      const transferResult = await transferToTreasury(
        wallet as Parameters<typeof transferToTreasury>[0],
        selectedTier,
        connection,
      );

      if (!transferResult.success || !transferResult.signature) {
        toast.error('Payment Failed', transferResult.error || 'Transaction failed');
        setTransferring(false);
        return;
      }

      setTransferring(false);

      // Step 2: Record bet on backend
      toast.info('Recording', 'Verifying and recording your prediction...');
      await placeBet({
        match_id: match.id,
        agent_id: selectedAgentId,
        amount_sol: betAmount,
        tx_signature: transferResult.signature,
        wallet_address: wallet.publicKey.toString(),
      });

      toast.success('Prediction Placed', `${betAmount} SOL on ${selectedAgent?.name ?? 'your champion'}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place bet';
      toast.error('Bet Failed', msg);
      setTransferring(false);
    }
  };

  // Not betting_open — panel not relevant
  if (!isBettingOpen || !match) {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className="text-neutral-600" />
          <span className="font-[var(--font-rajdhani)] text-xs tracking-widest uppercase text-neutral-500">
            Predictions
          </span>
        </div>
        <p className="font-mono text-[10px] text-neutral-600">
          Betting opens when a match is scheduled. Check back soon.
        </p>
      </div>
    );
  }

  // Wallet not connected
  if (!wallet.connected) {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className="text-[#D4A843]" />
          <span className="font-[var(--font-rajdhani)] text-xs tracking-widest uppercase text-[#D4A843]">
            Place Your Prediction
          </span>
        </div>
        <p className="font-mono text-[10px] text-neutral-500 mb-3">
          Connect your wallet to place predictions on this match.
        </p>
        <div className="py-3 border border-neutral-700 text-center font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
          Connect Wallet to Bet
        </div>
      </div>
    );
  }

  // Bet already placed successfully
  if (betPlaced) {
    return (
      <div className="bg-[#111] border border-emerald-500/30 p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border border-emerald-500/50 flex items-center justify-center mx-auto">
            <Check size={20} className="text-emerald-400" />
          </div>
          <div className="font-[var(--font-rajdhani)] text-sm tracking-widest uppercase text-emerald-400">
            Prediction Placed
          </div>
          <div className="font-mono text-[10px] text-neutral-400">
            {betAmount} SOL on {selectedAgent?.name ?? 'your champion'}
          </div>
          <div className="font-mono text-[9px] text-neutral-600">
            Odds update in real-time. Final payout based on closing odds.
          </div>
          <button
            onClick={reset}
            className="font-mono text-[10px] text-neutral-500 hover:text-[#D4A843] tracking-widest uppercase transition-colors"
          >
            Place Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#D4A843]/30 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Swords size={14} className="text-[#D4A843]" />
        <span className="font-[var(--font-rajdhani)] text-xs tracking-widest uppercase text-[#D4A843]">
          Place Your Prediction
        </span>
      </div>

      {/* No side selected */}
      {!selectedSide && (
        <div className="text-center py-4">
          <Swords size={20} className="text-neutral-600 mx-auto mb-2" />
          <p className="font-mono text-[10px] text-neutral-500">
            Click an agent card to pick your champion
          </p>
        </div>
      )}

      {/* Side selected — show betting form */}
      {selectedSide && selectedAgent && (
        <div className="space-y-4">
          {/* Selected agent */}
          <div className="text-center">
            <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase mb-1">
              Your Pick
            </div>
            <div
              className={`font-[var(--font-rajdhani)] text-sm tracking-widest uppercase font-bold ${
                selectedSide === 'A' ? 'text-[#D4A843]' : 'text-[#c0392b]'
              }`}
            >
              {selectedAgent.name}
            </div>
          </div>

          {/* Tier selector */}
          <div>
            <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase mb-2">
              Wager Amount
            </div>
            <div className="grid grid-cols-3 gap-1">
              {TIERS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTier(t.key)}
                  disabled={isLoading}
                  className={`py-2 border font-mono text-[10px] tracking-wider uppercase transition-colors ${
                    selectedTier === t.key
                      ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]'
                      : 'border-[#1a1a1a] text-neutral-500 hover:border-neutral-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div>{t.label}</div>
                  <div className="text-[9px] mt-0.5">{t.amount} SOL</div>
                </button>
              ))}
            </div>
          </div>

          {/* Odds info */}
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-neutral-500">Current Odds</span>
              <span className="text-white">{currentOdds.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-neutral-500">Your Wager</span>
              <span className="text-white">{betAmount} SOL</span>
            </div>
          </div>

          {/* Payout preview */}
          <PayoutPreview
            odds={currentOdds}
            betAmount={betAmount}
            agentName={selectedAgent.name}
          />

          {/* Place bet button */}
          <button
            onClick={handlePlaceBet}
            disabled={isLoading}
            className={`w-full py-3 border font-[var(--font-rajdhani)] text-xs tracking-widest uppercase transition-all ${
              isLoading
                ? 'border-neutral-700 bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'border-[#D4A843] bg-gradient-to-r from-[#D4A843]/20 via-[#D4A843]/10 to-[#D4A843]/20 text-[#D4A843] hover:bg-[#D4A843]/30'
            }`}
          >
            {transferring ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Sending SOL...
              </span>
            ) : placingBet ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Recording Prediction...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Swords size={14} />
                Place Prediction
              </span>
            )}
          </button>

          {/* Error */}
          {betError && (
            <div className="flex items-center gap-2 px-3 py-2 border border-red-500/30 bg-red-500/5">
              <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
              <span className="font-mono text-[10px] text-red-400">{betError}</span>
            </div>
          )}

          {/* Note */}
          <p className="font-mono text-[9px] text-neutral-600 text-center">
            Odds update in real-time. Final payout based on closing odds.
          </p>
        </div>
      )}

      {/* Parimutuel explainer */}
      <ParimutuelExplainer
        poolA={displayPoolA}
        poolB={displayPoolB}
        agentAName={match.agentA?.name}
        agentBName={match.agentB?.name}
      />
    </div>
  );
}
