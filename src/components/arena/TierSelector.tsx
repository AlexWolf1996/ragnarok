'use client';

import { motion } from 'framer-motion';
import { ArenaTier, TIER_CONFIG } from '@/types/battleRoyale';

interface TierSelectorProps {
  selectedTier: ArenaTier;
  onTierChange: (tier: ArenaTier) => void;
  showBuyIn?: boolean;
  disabled?: boolean;
}

const tiers: ArenaTier[] = ['bifrost', 'midgard', 'asgard'];

export default function TierSelector({
  selectedTier,
  onTierChange,
  showBuyIn = true,
  disabled = false,
}: TierSelectorProps) {
  return (
    <div className="flex gap-2">
      {tiers.map((tier) => {
        const config = TIER_CONFIG[tier];
        const isSelected = selectedTier === tier;

        return (
          <button
            key={tier}
            onClick={() => !disabled && onTierChange(tier)}
            disabled={disabled}
            className={`
              relative px-4 py-2 font-mono text-xs tracking-wider
              border transition-all duration-200
              ${isSelected
                ? `border-[${config.color}] bg-[${config.color}]/10 text-[${config.color}]`
                : 'border-[#2a2a35] bg-[#111118] text-[#666670] hover:border-[#3a3a45] hover:text-[#888890]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              rounded-sm
            `}
            style={{
              borderColor: isSelected ? config.color : undefined,
              backgroundColor: isSelected ? `${config.color}15` : undefined,
              color: isSelected ? config.color : undefined,
            }}
            aria-pressed={isSelected}
            aria-label={`Select ${config.name} tier`}
          >
            {isSelected && (
              <motion.div
                layoutId="tier-indicator"
                className="absolute inset-0 rounded-sm"
                style={{ backgroundColor: `${config.color}10` }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className="font-semibold">{config.name}</span>
              {showBuyIn && (
                <span className="text-[10px] opacity-70">
                  {config.buyIn} SOL
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
