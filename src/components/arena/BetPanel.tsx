'use client';

import { useState } from 'react';
import { Swords, Check, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { usePlaceBet } from '@/hooks/usePlaceBet';
import { useMatchOdds } from '@/hooks/useMatchOdds';
import { useMyBet } from '@/hooks/useMyBet';
import { transferToTreasury } from '@/lib/solana/transfer';
import { useToast } from '@/hooks/useToast';
import type { CurrentMatch } from '@/hooks/useCurrentMatch';
import PayoutPreview from './PayoutPreview';
import ParimutuelExplainer from './ParimutuelExplainer';

interface BetPanelProps {
  match: CurrentMatch | null;
  selectedSide: 'A' | 'B' | null;
}

const QUICK_PICKS = [0.05, 0.1, 0.5, 1] as const;
const MIN_BET = 0.01;

export default function BetPanel({ match, selectedSide }: BetPanelProps) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible: openWalletModal } = useWalletModal();
  const toast = useToast();
  const { placeBet, loading: placingBet, error: betError, success: betPlaced, reset } = usePlaceBet();
  const { poolA, poolB, oddsA, oddsB } = useMatchOdds(
    match?.id ?? null,
    match?.status ?? null,
  );
  const { hasBet, totalBet, betAgentId, betStatus, payout, refresh: refreshBets } = useMyBet(match?.id ?? null);

  const [betAmount, setBetAmount] = useState(0.1);
  const [customInput, setCustomInput] = useState('0.1');
  const [transferring, setTransferring] = useState(false);
  const [showBetForm, setShowBetForm] = useState(false);

  const isBettingOpen = match?.status === 'betting_open';
  const selectedAgent = selectedSide === 'A' ? match?.agentA : selectedSide === 'B' ? match?.agentB : null;
  const selectedAgentId = selectedSide === 'A' ? match?.agent_a_id : selectedSide === 'B' ? match?.agent_b_id : null;

  // Use live odds if available, otherwise fall back to match.odds
  const hasLiveOdds = poolA > 0 || poolB > 0;
  const displayOddsA = hasLiveOdds ? oddsA : (match?.odds?.oddsA || 2.0);
  const displayOddsB = hasLiveOdds ? oddsB : (match?.odds?.oddsB || 2.0);
  const displayPoolA = hasLiveOdds ? poolA : (match?.odds?.poolA || 0);
  const displayPoolB = hasLiveOdds ? poolB : (match?.odds?.poolB || 0);

  const currentOdds = selectedSide === 'A' ? displayOddsA : displayOddsB;
  const isValidBet = betAmount >= MIN_BET;

  const isLoading = transferring || placingBet;

  // Resolve which agent the user bet on
  const betAgent = betAgentId === match?.agent_a_id ? match?.agentA : betAgentId === match?.agent_b_id ? match?.agentB : null;
  const betSide: 'A' | 'B' | null = betAgentId === match?.agent_a_id ? 'A' : betAgentId === match?.agent_b_id ? 'B' : null;
  const betOdds = betSide === 'A' ? displayOddsA : betSide === 'B' ? displayOddsB : 0;

  const handlePlaceBet = async () => {
    if (!match || !selectedAgentId || !wallet.publicKey || !wallet.connected) return;

    setTransferring(true);
    try {
      toast.info('Payment', `Sending ${betAmount} SOL to treasury...`);
      const transferResult = await transferToTreasury(
        wallet as Parameters<typeof transferToTreasury>[0],
        betAmount,
        connection,
      );

      if (!transferResult.success || !transferResult.signature) {
        toast.error('Payment Failed', transferResult.error || 'Transaction failed');
        setTransferring(false);
        return;
      }

      setTransferring(false);

      toast.info('Recording', 'Verifying and recording your prediction...');
      await placeBet({
        match_id: match.id,
        agent_id: selectedAgentId,
        amount_sol: betAmount,
        tx_signature: transferResult.signature,
        wallet_address: wallet.publicKey.toString(),
      });

      toast.success('Prediction Placed', `${betAmount} SOL on ${selectedAgent?.name ?? 'your champion'}`);
      setShowBetForm(false);
      // Refresh bets to pick up the new bet
      refreshBets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place bet';
      toast.error('Bet Failed', msg);
      setTransferring(false);
    }
  };

  // ──────────────────────────────────────────────
  // RENDER: User has an active bet — show position
  // ──────────────────────────────────────────────
  if (hasBet && !showBetForm) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-emerald-500/30 p-6 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="font-[var(--font-rajdhani)] text-xs tracking-widest uppercase text-emerald-400">
            Your Position
          </span>
        </div>

        {/* Position details */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-neutral-500">Backing</span>
            <span className={betSide === 'A' ? 'text-[#D4A843]' : 'text-[#c0392b]'}>
              {betAgent?.name ?? 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-neutral-500">Your Stake</span>
            <span className="text-white">{totalBet} SOL</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-neutral-500">Current Odds</span>
            <span className="text-white">{betOdds > 0 ? `${betOdds.toFixed(2)}x` : '—'}</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-neutral-500">Potential Return</span>
            <span className="text-emerald-400">
              {betOdds > 0 ? `${(totalBet * betOdds).toFixed(4)} SOL` : '—'}
            </span>
          </div>
        </div>

        {/* Status-specific message */}
        <div className="pt-2 border-t border-[#1a1a1a]">
          {betStatus === 'won' && (
            <div className="text-center space-y-1">
              <div className="font-[var(--font-rajdhani)] text-sm tracking-widest uppercase text-emerald-400">
                You Won!
              </div>
              <div className="font-mono text-[10px] text-emerald-400">
                Payout: {payout.toFixed(4)} SOL
              </div>
            </div>
          )}
          {betStatus === 'lost' && (
            <div className="text-center">
              <div className="font-[var(--font-rajdhani)] text-sm tracking-widest uppercase text-red-400">
                Defeated
              </div>
              <div className="font-mono text-[9px] text-neutral-600 mt-1">
                Better luck next battle.
              </div>
            </div>
          )}
          {(!betStatus || betStatus === 'pending') && match?.status === 'in_progress' && (
            <div className="text-center">
              <div className="font-mono text-[10px] text-red-400 tracking-widest uppercase">
                Battle in Progress
              </div>
              <div className="font-mono text-[9px] text-neutral-600 mt-1">
                Agents are competing. Your prediction is locked.
              </div>
            </div>
          )}
          {(!betStatus || betStatus === 'pending') && match?.status === 'judging' && (
            <div className="text-center">
              <div className="font-mono text-[10px] text-[#D4A843] tracking-widest uppercase">
                Judges Deliberating
              </div>
              <div className="font-mono text-[9px] text-neutral-600 mt-1">
                Results incoming. Final payout based on closing odds.
              </div>
            </div>
          )}
          {(!betStatus || betStatus === 'pending') && isBettingOpen && (
            <div className="text-center space-y-2">
              <div className="font-mono text-[9px] text-neutral-600">
                Odds update in real-time. Final payout based on closing odds.
              </div>
              <button
                onClick={() => { reset(); setShowBetForm(true); }}
                className="font-mono text-[10px] text-neutral-500 hover:text-[#D4A843] tracking-widest uppercase transition-colors"
              >
                Place Another Prediction
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Betting not open (and no active bet)
  // ──────────────────────────────────────────────
  if (!isBettingOpen) {
    const statusMessage = getStatusMessage(match?.status ?? null);
    return (
      <div className={`bg-black/40 backdrop-blur-sm border p-6 ${statusMessage.borderClass}`}>
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className={statusMessage.iconClass} />
          <span className={`font-[var(--font-rajdhani)] text-xs tracking-widest uppercase ${statusMessage.titleClass}`}>
            {statusMessage.title}
          </span>
        </div>
        <p className="font-mono text-[10px] text-neutral-600">
          {statusMessage.message}
        </p>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Wallet not connected
  // ──────────────────────────────────────────────
  if (!wallet.connected) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-neutral-800 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c]/50 to-transparent" />
        <div className="flex items-center gap-2 mb-3">
          <Swords size={14} className="text-[#D4A843]" />
          <span className="font-[var(--font-rajdhani)] text-xs tracking-widest uppercase text-[#D4A843]">
            Place Your Prediction
          </span>
        </div>
        <p className="font-mono text-[10px] text-neutral-500 mb-3">
          Connect your wallet to place predictions on this match.
        </p>
        <button
          onClick={() => openWalletModal(true)}
          className="w-full py-3 border border-[#D4A843]/40 hover:border-[#D4A843] bg-[#D4A843]/5 hover:bg-[#D4A843]/10 text-center font-mono text-[10px] text-[#D4A843] tracking-widest uppercase transition-colors cursor-pointer"
        >
          Connect Wallet to Bet
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Bet just placed (ephemeral confirmation before useMyBet picks it up)
  // ──────────────────────────────────────────────
  if (betPlaced && !showBetForm) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-emerald-500/30 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
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
            onClick={() => { reset(); setShowBetForm(true); }}
            className="font-mono text-[10px] text-neutral-500 hover:text-[#D4A843] tracking-widest uppercase transition-colors"
          >
            Place Another
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // RENDER: Betting form
  // ──────────────────────────────────────────────
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-[#D4A843]/30 p-6 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c]/50 to-transparent" />
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

          {/* Wager amount input */}
          <div>
            <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase mb-2">
              Wager Amount
            </div>
            <div className="relative">
              <input
                type="number"
                min={MIN_BET}
                step="0.01"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) setBetAmount(val);
                }}
                onBlur={() => {
                  if (betAmount < MIN_BET) {
                    setBetAmount(MIN_BET);
                    setCustomInput(String(MIN_BET));
                  }
                }}
                disabled={isLoading}
                className={`w-full bg-black border py-2.5 px-3 pr-12 font-mono text-sm text-white outline-none transition-colors ${
                  !isValidBet ? 'border-red-500/50' : 'border-[#1a1a1a] focus:border-[#D4A843]'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-neutral-500">
                SOL
              </span>
            </div>
            {!isValidBet && (
              <div className="font-mono text-[9px] text-red-400 mt-1">
                Minimum wager is {MIN_BET} SOL
              </div>
            )}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {QUICK_PICKS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setBetAmount(amt); setCustomInput(String(amt)); }}
                  disabled={isLoading}
                  className={`min-h-[32px] py-1.5 border font-mono text-[10px] tracking-wider transition-all ${
                    betAmount === amt
                      ? 'border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843] shadow-[0_0_10px_rgba(201,168,76,0.2)]'
                      : 'border-[#1a1a1a] text-neutral-500 hover:border-neutral-600'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Odds info */}
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-neutral-500">Current Odds</span>
              <span className="text-white">{currentOdds > 0 ? `${currentOdds.toFixed(2)}x` : '—'}</span>
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
            disabled={isLoading || !isValidBet}
            className={`w-full min-h-[44px] py-3 border font-[var(--font-rajdhani)] text-xs tracking-widest uppercase transition-all ${
              isLoading || !isValidBet
                ? 'border-neutral-700 bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'border-[#D4A843] bg-gradient-to-r from-[#D4A843]/20 via-[#D4A843]/10 to-[#D4A843]/20 text-[#D4A843] hover:bg-[#D4A843]/30 shadow-[0_0_20px_rgba(201,168,76,0.3)]'
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

function getStatusMessage(status: string | null) {
  switch (status) {
    case 'in_progress':
      return {
        title: 'Battle in Progress',
        message: 'Predictions are locked. Agents are competing now.',
        borderClass: 'border-red-500/20',
        iconClass: 'text-red-400',
        titleClass: 'text-red-400',
      };
    case 'judging':
      return {
        title: 'Judges Deliberating',
        message: 'Predictions locked. Results incoming.',
        borderClass: 'border-[#D4A843]/20',
        iconClass: 'text-[#D4A843]',
        titleClass: 'text-[#D4A843]',
      };
    case 'completed':
      return {
        title: 'Battle Complete',
        message: 'This match has ended. Payouts have been processed.',
        borderClass: 'border-emerald-500/20',
        iconClass: 'text-emerald-400',
        titleClass: 'text-emerald-400',
      };
    case 'scheduled':
      return {
        title: 'Match Scheduled',
        message: 'Betting opens shortly. Stand by.',
        borderClass: 'border-[#D4A843]/20',
        iconClass: 'text-[#D4A843]/60',
        titleClass: 'text-[#D4A843]/60',
      };
    default:
      return {
        title: 'Predictions',
        message: 'No active match. The scheduler will summon the next battle.',
        borderClass: 'border-[#1a1a1a]',
        iconClass: 'text-neutral-600',
        titleClass: 'text-neutral-500',
      };
  }
}
