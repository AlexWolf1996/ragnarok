'use client';

import { motion } from 'framer-motion';
import { Swords, Crown } from 'lucide-react';
import { ArenaMode } from '@/types/battleRoyale';

interface ModeToggleProps {
  mode: ArenaMode;
  onModeChange: (mode: ArenaMode) => void;
  disabled?: boolean;
}

const modes: { value: ArenaMode; label: string; icon: typeof Swords; description: string; comingSoon?: boolean }[] = [
  {
    value: 'duel',
    label: 'DUEL',
    icon: Swords,
    description: '1v1 matches',
  },
  {
    value: 'ragnarok',
    label: 'RAGNAROK',
    icon: Crown,
    description: 'Battle Royale',
    comingSoon: true,
  },
];

export default function ModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-sm border border-neutral-800 bg-black/60 p-1">
      {modes.map((m) => {
        const Icon = m.icon;
        const isSelected = mode === m.value;

        const isDisabled = disabled || !!m.comingSoon;

        return (
          <button
            key={m.value}
            onClick={() => !isDisabled && onModeChange(m.value)}
            disabled={isDisabled}
            className={`
              relative px-4 py-2 font-mono text-xs tracking-wider
              transition-colors duration-200
              ${isSelected
                ? 'text-[#c9a84c]'
                : m.comingSoon
                  ? 'text-neutral-600'
                  : 'text-neutral-500 hover:text-neutral-400'
              }
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-pressed={isSelected}
            aria-label={`Select ${m.label} mode${m.comingSoon ? ' (coming soon)' : ''}`}
          >
            {isSelected && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-sm bg-[#c9a84c]/10 border border-[#c9a84c]/30"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={14} aria-hidden="true" />
              <span>{m.label}</span>
              {m.comingSoon && (
                <span className="text-[8px] px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-500 tracking-widest">
                  SOON
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
