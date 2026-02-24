'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, X } from 'lucide-react';
import {
  ArenaTier,
  PayoutType,
  TIER_CONFIG,
  calculatePayoutPreview,
} from '@/types/battleRoyale';
import { createBattle } from '@/lib/supabase/battleRoyale';
import TierSelector from './TierSelector';

interface CreateBattleRoyaleProps {
  walletAddress: string;
  onCreated?: (battleId: string) => void;
  onClose?: () => void;
}

export default function CreateBattleRoyale({
  walletAddress,
  onCreated,
  onClose,
}: CreateBattleRoyaleProps) {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<ArenaTier>('midgard');
  const [maxAgents, setMaxAgents] = useState<number | null>(null);
  const [numRounds, setNumRounds] = useState(3);
  const [payoutStructure, setPayoutStructure] = useState<PayoutType>('winner_takes_all');
  const [registrationMinutes, setRegistrationMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierConfig = TIER_CONFIG[tier];

  // Preview payout with estimated participants
  const estimatedParticipants = maxAgents || 8;
  const payoutPreview = calculatePayoutPreview(
    tierConfig.buyIn,
    estimatedParticipants,
    tierConfig.platformFeePct,
    payoutStructure
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createBattle({
        name: name.trim() || undefined,
        tier,
        buyInSol: tierConfig.buyIn,
        maxAgents,
        numRounds,
        payoutStructure,
        registrationMinutes,
        walletAddress,
      });

      if (result.success && result.battle_id) {
        onCreated?.(result.battle_id);
      } else {
        setError(result.error || 'Failed to create battle');
      }
    } catch (err) {
      setError('Failed to create battle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f]/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-[#111118] border border-[#2a2a35] rounded-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
          <h2 className="font-mono text-lg text-[#e8e8e8] tracking-wider">
            CREATE BATTLE ROYALE
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#666670] hover:text-[#e8e8e8] transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Battle Name */}
          <div>
            <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
              BATTLE NAME (OPTIONAL)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a35] rounded-sm
                       font-mono text-sm text-[#e8e8e8] placeholder-[#444450]
                       focus:outline-none focus:border-[#d4a843] transition-colors"
            />
          </div>

          {/* Tier Selection */}
          <div>
            <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
              TIER
            </label>
            <TierSelector selectedTier={tier} onTierChange={setTier} />
          </div>

          {/* Grid for number inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
                MAX AGENTS
              </label>
              <input
                type="number"
                value={maxAgents || ''}
                onChange={(e) => setMaxAgents(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="No limit"
                min={4}
                max={32}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a35] rounded-sm
                         font-mono text-sm text-[#e8e8e8] placeholder-[#444450]
                         focus:outline-none focus:border-[#d4a843] transition-colors"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
                ROUNDS
              </label>
              <select
                value={numRounds}
                onChange={(e) => setNumRounds(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a35] rounded-sm
                         font-mono text-sm text-[#e8e8e8]
                         focus:outline-none focus:border-[#d4a843] transition-colors"
              >
                <option value={3}>3 Rounds</option>
                <option value={5}>5 Rounds</option>
                <option value={7}>7 Rounds</option>
              </select>
            </div>
          </div>

          {/* Payout Structure */}
          <div>
            <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
              PAYOUT STRUCTURE
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayoutStructure('winner_takes_all')}
                className={`flex-1 py-2 font-mono text-xs tracking-wider border rounded-sm transition-colors
                  ${payoutStructure === 'winner_takes_all'
                    ? 'border-[#d4a843] bg-[#d4a843]/10 text-[#d4a843]'
                    : 'border-[#2a2a35] text-[#666670] hover:border-[#3a3a45]'
                  }`}
              >
                WINNER TAKES ALL
              </button>
              <button
                type="button"
                onClick={() => setPayoutStructure('top_three')}
                className={`flex-1 py-2 font-mono text-xs tracking-wider border rounded-sm transition-colors
                  ${payoutStructure === 'top_three'
                    ? 'border-[#d4a843] bg-[#d4a843]/10 text-[#d4a843]'
                    : 'border-[#2a2a35] text-[#666670] hover:border-[#3a3a45]'
                  }`}
              >
                TOP 3 (60/25/15)
              </button>
            </div>
          </div>

          {/* Registration Time */}
          <div>
            <label className="block font-mono text-xs text-[#888890] mb-2 tracking-wider">
              REGISTRATION TIME
            </label>
            <select
              value={registrationMinutes}
              onChange={(e) => setRegistrationMinutes(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a35] rounded-sm
                       font-mono text-sm text-[#e8e8e8]
                       focus:outline-none focus:border-[#d4a843] transition-colors"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Payout Preview */}
          <div className="bg-[#0a0a0f] border border-[#1a1a25] rounded-sm p-3">
            <div className="font-mono text-xs text-[#666670] mb-2">
              PAYOUT PREVIEW ({estimatedParticipants} participants)
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-mono text-lg text-[#d4a843]">
                  {payoutPreview.firstPlace.toFixed(2)}
                </div>
                <div className="font-mono text-[10px] text-[#666670]">1ST</div>
              </div>
              <div>
                <div className="font-mono text-lg text-[#888890]">
                  {payoutPreview.secondPlace.toFixed(2)}
                </div>
                <div className="font-mono text-[10px] text-[#666670]">2ND</div>
              </div>
              <div>
                <div className="font-mono text-lg text-[#666670]">
                  {payoutPreview.thirdPlace.toFixed(2)}
                </div>
                <div className="font-mono text-[10px] text-[#666670]">3RD</div>
              </div>
            </div>
          </div>

          {error && (
            <p className="font-mono text-xs text-[#ef4444]">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-mono text-sm tracking-wider
                     bg-[#d4a843] text-[#0a0a0f] rounded-sm
                     hover:bg-[#e4b853] transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus size={16} />
                CREATE BATTLE
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
