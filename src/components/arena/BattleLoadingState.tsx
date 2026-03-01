'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Norse runes for the spinner
const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ'];

interface BattleLoadingStateProps {
  challengePrompt?: string;
  agentAName?: string;
  agentBName?: string;
}

function RuneSpinner() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{
            scale: activeIndex === i ? 1.3 : 1,
            opacity: activeIndex === i ? 1 : 0.4,
            color: activeIndex === i ? '#f59e0b' : '#525252',
          }}
          transition={{ duration: 0.2 }}
          className="text-3xl font-bold"
        >
          {RUNES[(i + Math.floor(Date.now() / 1000)) % RUNES.length]}
        </motion.span>
      ))}
    </div>
  );
}

function PulsingDots() {
  return (
    <span className="inline-flex gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full"
        />
      ))}
    </span>
  );
}

export default function BattleLoadingState({
  challengePrompt,
  agentAName,
  agentBName,
}: BattleLoadingStateProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusMessages = [
    'THE NORNS WEAVE FATE',
    'WARRIORS CLASH',
    'WISDOM IS TESTED',
    'THE ALLFATHER WATCHES',
    'JUDGMENT APPROACHES',
  ];

  const currentMessage = statusMessages[Math.floor(elapsedSeconds / 4) % statusMessages.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-black/80 backdrop-blur-sm border border-[#c9a84c]/30 rounded-sm overflow-hidden relative"
    >
      {/* Top glow line with animation */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '200% 0%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <div className="p-8 md:p-12 text-center">
        {/* Rune spinner */}
        <RuneSpinner />

        {/* Main status text */}
        <motion.h2
          key={currentMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="font-[var(--font-orbitron)] text-lg md:text-xl tracking-[0.2em] text-[#c9a84c] mb-2"
          style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}
        >
          {currentMessage}
          <PulsingDots />
        </motion.h2>

        {/* Sub-status */}
        <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">
          AI warriors are competing in real-time
        </p>

        {/* Combatants display */}
        {agentAName && agentBName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <div className="text-right">
              <span className="font-[var(--font-orbitron)] text-sm text-white">
                {agentAName}
              </span>
            </div>
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-red-500"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6" />
                <path d="M16 16l4 4" />
                <path d="M19 21l2-2" />
              </svg>
            </motion.div>
            <div className="text-left">
              <span className="font-[var(--font-orbitron)] text-sm text-white">
                {agentBName}
              </span>
            </div>
          </motion.div>
        )}

        {/* Challenge prompt */}
        {challengePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black/60 border border-neutral-800 rounded-sm p-4 max-w-xl mx-auto mb-6"
          >
            <span className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-[#c9a84c]/70 block mb-2">
              THE CHALLENGE
            </span>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-300 leading-relaxed">
              {challengePrompt}
            </p>
          </motion.div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 bg-[#c9a84c] rounded-full"
            />
            <span className="font-mono text-xs text-neutral-500">
              {elapsedSeconds}s elapsed
            </span>
          </div>
          <span className="text-neutral-600">•</span>
          <span className="font-mono text-xs text-neutral-500">
            ~15 seconds typical
          </span>
        </div>
      </div>
    </motion.div>
  );
}
