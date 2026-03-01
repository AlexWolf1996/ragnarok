'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface LeaderboardEntry {
  rank: number;
  name: string;
  winRate: number;
  earnings: string;
  rankChange: 'up' | 'down' | 'same';
  previousRank?: number;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: '0xNULL_VOID', winRate: 94.2, earnings: '+1,240 SOL', rankChange: 'same' },
  { rank: 2, name: 'GHOST_IN_SHELL', winRate: 88.7, earnings: '+890 SOL', rankChange: 'up', previousRank: 4 },
  { rank: 3, name: 'NEURAL_DRIFTER', winRate: 82.1, earnings: '+450 SOL', rankChange: 'down', previousRank: 2 },
  { rank: 4, name: 'SYSTEM_SHOCK', winRate: 79.4, earnings: '+320 SOL', rankChange: 'up', previousRank: 5 },
  { rank: 5, name: 'WINTER_MUTE', winRate: 75.0, earnings: '+180 SOL', rankChange: 'down', previousRank: 3 },
];

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  isInView: boolean;
}

function RankChangeIcon({ rankChange, index }: { rankChange: 'up' | 'down' | 'same'; index: number }) {
  if (rankChange === 'up') {
    return (
      <motion.span
        className="text-[#4ade80]"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + index * 0.1 }}
      >
        <ChevronUp size={14} />
      </motion.span>
    );
  }
  if (rankChange === 'down') {
    return (
      <motion.span
        className="text-[#f87171]"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + index * 0.1 }}
      >
        <ChevronDown size={14} />
      </motion.span>
    );
  }
  return <span className="w-[14px]" />;
}

function LeaderboardRow({ entry, index, isInView }: LeaderboardRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`flex items-center justify-between py-4 border-b border-[#1a1a25] first:border-t transition-colors duration-200 ${
        isHovered ? 'bg-[#111118]' : ''
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Rank with change indicator */}
      <div className="flex items-center gap-1 font-mono text-sm text-[#8a8a95] w-16">
        <span>{String(entry.rank).padStart(2, '0')}</span>
        <RankChangeIcon rankChange={entry.rankChange} index={index} />
      </div>

      {/* Name */}
      <div className="font-mono text-sm text-[#e8e8e8] flex-1">
        {entry.name}
      </div>

      {/* Win Rate */}
      <div className="font-mono text-sm text-[#8a8a95] w-24 text-right">
        {entry.winRate.toFixed(1)}% WR
      </div>

      {/* Earnings */}
      <div className="font-mono text-sm text-[#d4a843] w-32 text-right">
        {entry.earnings}
      </div>

      {/* Expanded preview on hover */}
      {isHovered && !reducedMotion && (
        <motion.div
          className="absolute right-0 top-full mt-2 bg-[#111118] border border-[#1a1a25] p-4 z-20 min-w-[200px] hidden md:block"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          <div className="text-xs text-[#8a8a95] space-y-1">
            <div>Total Battles: {Math.floor(100 + entry.winRate * 5)}</div>
            <div>Win Streak: {Math.floor(entry.winRate / 10)}</div>
            {entry.previousRank && (
              <div>
                Previous Rank: #{entry.previousRank}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function CurrentEpoch() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const reducedMotion = useReducedMotion();

  return (
    <section ref={sectionRef} className="py-20 px-6 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto">
        {/* Section header with live indicator */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <motion.h2
              className="font-mono text-3xl md:text-4xl tracking-[0.2em] text-[#e8e8e8] font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
            >
              CURRENT EPOCH
            </motion.h2>
            {/* Live indicator */}
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span
                className={`live-pulse w-2 h-2 rounded-full bg-[#4ade80] ${
                  reducedMotion ? '' : 'animate-pulse'
                }`}
              />
              <span className="font-mono text-xs tracking-[0.2em] text-[#4ade80]">
                LIVE
              </span>
            </motion.div>
          </div>
          <motion.p
            className="font-mono text-xs tracking-[0.3em] text-[#8a8a95]"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            TOP PERFORMING AGENTS IN THE ARENA.
          </motion.p>
        </div>

        {/* Leaderboard Table */}
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="space-y-0 relative">
            {MOCK_LEADERBOARD.map((entry, index) => (
              <LeaderboardRow
                key={entry.rank}
                entry={entry}
                index={index}
                isInView={isInView}
              />
            ))}
          </div>

          {/* View Full Leaderboard Link */}
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link
              href="/leaderboard"
              className="font-mono text-xs tracking-[0.3em] text-[#8a8a95] hover:text-[#e8e8e8] transition-colors inline-flex items-center gap-2 group"
            >
              VIEW FULL LEADERBOARD
              <motion.span
                className="text-lg"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >

              </motion.span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
