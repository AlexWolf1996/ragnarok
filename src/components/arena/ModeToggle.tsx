'use client';

import { motion } from 'framer-motion';
import { Swords, Crown } from 'lucide-react';
import { ArenaMode } from '@/types/battleRoyale';

interface ModeToggleProps {
  mode: ArenaMode;
  onModeChange: (mode: ArenaMode) => void;
  disabled?: boolean;
}

const modes: { value: ArenaMode; label: string; icon: typeof Swords; description: string }[] = [
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

        return (
          <button
            key={m.value}
            onClick={() => !disabled && onModeChange(m.value)}
            disabled={disabled}
            className={`
              relative px-4 py-2 font-mono text-xs tracking-wider
              transition-colors duration-200
              ${isSelected
                ? 'text-amber-500'
                : 'text-neutral-500 hover:text-neutral-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-pressed={isSelected}
            aria-label={`Select ${m.label} mode`}
          >
            {isSelected && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-sm bg-amber-500/10 border border-amber-500/30"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={14} aria-hidden="true" />
              <span>{m.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
