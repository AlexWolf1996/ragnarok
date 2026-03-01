'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Swords,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Zap,
  Quote,
} from 'lucide-react';
import Link from 'next/link';

interface AgentResult {
  id: string;
  name: string;
  score: number;
  elo: number;
  newElo: number;
  eloDelta: number;
  isWinner: boolean;
  response: string;
}

interface ChallengeInfo {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  prompt: string;
}

interface JudgeVoteDisplay {
  judgeId: string;
  judgeName: string;
  model: string;
  scoreA: number;
  scoreB: number;
  winnerId: 'A' | 'B' | 'TIE';
  reasoning: string;
  failed: boolean;
}

interface BattleResultDisplayProps {
  agentA: AgentResult;
  agentB: AgentResult;
  challenge: ChallengeInfo;
  reasoning: string;
  judges?: JudgeVoteDisplay[];
  isSplitDecision?: boolean;
  isUnanimous?: boolean;
  onFightAgain: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
  /** Historical match view — hides ELO deltas and FIGHT AGAIN button */
  isHistorical?: boolean;
}

function AnimatedScore({
  target,
  isWinner,
  delay = 0,
}: {
  target: number;
  isWinner: boolean;
  delay?: number;
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const timeout = setTimeout(() => {
      setHasAnimated(true);
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing function for smooth slowdown
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(target * eased));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, delay, hasAnimated]);

  return (
    <span className={`font-mono text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums ${
      isWinner ? 'text-[#D4A843]' : 'text-neutral-400'
    }`}>
      {displayScore}
    </span>
  );
}

function ScoreBar({ scoreA, scoreB }: { scoreA: number; scoreB: number }) {
  const total = scoreA + scoreB;
  const percentA = total > 0 ? (scoreA / total) * 100 : 50;
  const [animatedPercent, setAnimatedPercent] = useState(50);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedPercent(percentA);
    }, 800);
    return () => clearTimeout(timeout);
  }, [percentA]);

  return (
    <div className="relative h-3 bg-neutral-800 rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#a88a3d] to-[#D4A843]"
        initial={{ width: '50%' }}
        animate={{ width: `${animatedPercent}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
      />
      <motion.div
        className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-600 to-red-400"
        initial={{ width: '50%' }}
        animate={{ width: `${100 - animatedPercent}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
      />
      {/* Center marker */}
      <div className="absolute inset-y-0 left-1/2 w-[2px] bg-white/30 -translate-x-1/2" />
    </div>
  );
}

function getChallengeTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'reasoning': return 'bg-[#c9a84c]/20 text-[#D4A843] border-[#c9a84c]/30';
    case 'creative': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'strategy': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'code': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'knowledge': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
    case 'bifrost': return 'bg-[#a88a3d]/20 text-[#D4A843] border-[#c9a84c]/30';
    case 'medium':
    case 'midgard': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'hard':
    case 'asgard': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  }
}

function getJudgeColor(judgeId: string): string {
  switch (judgeId) {
    case 'odin': return 'text-[#D4A843] border-[#c9a84c]/30 bg-[#c9a84c]/10';
    case 'thor': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    case 'freya': return 'text-pink-400 border-pink-500/30 bg-pink-500/10';
    default: return 'text-neutral-400 border-neutral-500/30 bg-neutral-500/10';
  }
}

function getJudgeIcon(judgeId: string): string {
  switch (judgeId) {
    case 'odin': return '👁';
    case 'thor': return '⚡';
    case 'freya': return '✨';
    default: return '⚖️';
  }
}

export default function BattleResultDisplay({
  agentA,
  agentB,
  challenge,
  reasoning,
  judges,
  isSplitDecision = false,
  isUnanimous = false,
  onFightAgain,
  onDismiss,
  isLoading = false,
  isHistorical = false,
}: BattleResultDisplayProps) {
  const [showResponses, setShowResponses] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-black/80 backdrop-blur-sm border border-[#c9a84c]/30 rounded-sm overflow-hidden relative"
    >
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

      {/* Challenge prompt banner */}
      <div className="bg-black/60 border-b border-neutral-800 p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`text-[10px] px-2 py-0.5 rounded border ${getChallengeTypeColor(challenge.type)}`}>
            {challenge.type.toUpperCase()}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${getDifficultyColor(challenge.difficulty)}`}>
            {challenge.difficulty.toUpperCase()}
          </span>
        </div>
        <h3 className="font-[var(--font-orbitron)] text-xs tracking-[0.15em] text-[#c9a84c]/70 text-center mb-1">
          TRIAL BY COMBAT
        </h3>
        <p className="font-[var(--font-rajdhani)] text-sm text-neutral-300 text-center max-w-2xl mx-auto line-clamp-2">
          {challenge.prompt}
        </p>
      </div>

      {/* VS Battle Display */}
      <div className="p-4 sm:p-6 md:p-8">
        {/* Main VS Layout */}
        <div className="grid grid-cols-3 gap-4 items-center mb-6">
          {/* Agent A */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-center relative ${!agentA.isWinner ? 'opacity-60' : ''}`}
          >
            {agentA.isWinner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2"
              >
                <Crown size={24} className="text-[#D4A843]" />
              </motion.div>
            )}
            <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-gradient-to-br ${
              agentA.isWinner
                ? 'from-[#c9a84c]/30 to-[#8a6d2b]/30 border-2 border-[#c9a84c]/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                : 'from-neutral-700/30 to-neutral-800/30 border border-neutral-700'
            } flex items-center justify-center mb-3 mt-4`}>
              <span className="font-[var(--font-orbitron)] text-2xl md:text-3xl text-white/80">
                {agentA.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <Link
              href={`/agents/${agentA.id}`}
              className={`font-[var(--font-orbitron)] text-sm md:text-base tracking-wider mb-1 block hover:underline ${
                agentA.isWinner ? 'text-[#D4A843] hover:text-[#D4A843]' : 'text-neutral-400 hover:text-neutral-300'
              }`}
            >
              {agentA.name}
            </Link>
            <div className="font-mono text-xs text-neutral-500">
              ELO {agentA.elo}
            </div>
            {agentA.isWinner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="mt-1 font-[var(--font-orbitron)] text-[10px] text-[#c9a84c] tracking-wider"
              >
                VICTOR
              </motion.div>
            )}
          </motion.div>

          {/* Center: Scores + VS */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <AnimatedScore target={agentA.score} isWinner={agentA.isWinner} delay={300} />
              <div className="flex flex-col items-center">
                <Swords size={20} className="text-red-500 mb-1" />
                <span className="font-[var(--font-orbitron)] text-xs text-red-500/70">VS</span>
              </div>
              <AnimatedScore target={agentB.score} isWinner={agentB.isWinner} delay={300} />
            </div>

            {/* Score bar */}
            <ScoreBar scoreA={agentA.score} scoreB={agentB.score} />
          </div>

          {/* Agent B */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-center relative ${!agentB.isWinner ? 'opacity-60' : ''}`}
          >
            {agentB.isWinner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2"
              >
                <Crown size={24} className="text-[#D4A843]" />
              </motion.div>
            )}
            <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-gradient-to-br ${
              agentB.isWinner
                ? 'from-[#c9a84c]/30 to-[#8a6d2b]/30 border-2 border-[#c9a84c]/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                : 'from-neutral-700/30 to-neutral-800/30 border border-neutral-700'
            } flex items-center justify-center mb-3 mt-4`}>
              <span className="font-[var(--font-orbitron)] text-2xl md:text-3xl text-white/80">
                {agentB.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <Link
              href={`/agents/${agentB.id}`}
              className={`font-[var(--font-orbitron)] text-sm md:text-base tracking-wider mb-1 block hover:underline ${
                agentB.isWinner ? 'text-[#D4A843] hover:text-[#D4A843]' : 'text-neutral-400 hover:text-neutral-300'
              }`}
            >
              {agentB.name}
            </Link>
            <div className="font-mono text-xs text-neutral-500">
              ELO {agentB.elo}
            </div>
            {agentB.isWinner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="mt-1 font-[var(--font-orbitron)] text-[10px] text-[#c9a84c] tracking-wider"
              >
                VICTOR
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ELO Changes — hidden for historical matches where delta is unknown */}
        {!isHistorical && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
            className="flex justify-center gap-8 mb-6"
          >
            <div className="flex items-center gap-2">
              {agentA.eloDelta >= 0 ? (
                <TrendingUp size={16} className="text-emerald-400" />
              ) : (
                <TrendingDown size={16} className="text-red-400" />
              )}
              <span className={`font-mono text-sm font-bold ${
                agentA.eloDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {agentA.eloDelta >= 0 ? '+' : ''}{agentA.eloDelta}
              </span>
              <span className="text-[10px] text-neutral-500">ELO</span>
            </div>
            <div className="flex items-center gap-2">
              {agentB.eloDelta >= 0 ? (
                <TrendingUp size={16} className="text-emerald-400" />
              ) : (
                <TrendingDown size={16} className="text-red-400" />
              )}
              <span className={`font-mono text-sm font-bold ${
                agentB.eloDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {agentB.eloDelta >= 0 ? '+' : ''}{agentB.eloDelta}
              </span>
              <span className="text-[10px] text-neutral-500">ELO</span>
            </div>
          </motion.div>
        )}

        {/* Multi-Judge Panel */}
        {judges && judges.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4 }}
            className="mb-6"
          >
            {/* Decision badge */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <h4 className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-[#c9a84c]/70">
                JUDGE PANEL
              </h4>
              {isSplitDecision && (
                <span className="text-[10px] px-2 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400 font-[var(--font-orbitron)] tracking-wider animate-pulse">
                  SPLIT DECISION
                </span>
              )}
              {isUnanimous && (
                <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-[var(--font-orbitron)] tracking-wider">
                  UNANIMOUS
                </span>
              )}
            </div>

            {/* 3 Judge Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {judges.map((judge, i) => (
                <motion.div
                  key={judge.judgeId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.5 + i * 0.15 }}
                  className={`border rounded-sm p-3 text-center relative ${
                    judge.failed
                      ? 'border-neutral-700 bg-neutral-900/50 opacity-50'
                      : getJudgeColor(judge.judgeId)
                  }`}
                >
                  {/* Judge name */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <span className="text-sm">{getJudgeIcon(judge.judgeId)}</span>
                    <span className="font-[var(--font-orbitron)] text-[10px] tracking-[0.15em]">
                      {judge.judgeName}
                    </span>
                  </div>

                  {judge.failed ? (
                    <div className="text-[10px] text-neutral-500 font-mono">OFFLINE</div>
                  ) : (
                    <>
                      {/* Individual scores */}
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className={`font-mono text-lg font-bold ${
                          judge.winnerId === 'A' ? 'text-[#D4A843]' : 'text-neutral-500'
                        }`}>
                          {judge.scoreA}
                        </span>
                        <span className="text-neutral-600 text-xs">-</span>
                        <span className={`font-mono text-lg font-bold ${
                          judge.winnerId === 'B' ? 'text-red-400' : 'text-neutral-500'
                        }`}>
                          {judge.scoreB}
                        </span>
                      </div>

                      {/* Winner indicator */}
                      <div className={`text-[9px] font-[var(--font-orbitron)] tracking-wider ${
                        judge.winnerId === 'A' ? 'text-[#D4A843]' :
                        judge.winnerId === 'B' ? 'text-red-400' : 'text-neutral-500'
                      }`}>
                        {judge.winnerId === 'TIE' ? 'DRAW' : judge.winnerId === 'A' ? agentA.name.split(' ')[0] : agentB.name.split(' ')[0]}
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Combined reasoning */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.0 }}
              className="mt-3 bg-black/40 border border-[#c9a84c]/20 rounded-sm p-3 relative"
            >
              <Quote size={12} className="absolute top-2 left-2 text-[#c9a84c]/30" />
              <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 leading-relaxed text-center italic px-4">
                {judges.filter(j => !j.failed).map(j => j.reasoning).join(' | ')}
              </p>
            </motion.div>
          </motion.div>
        ) : (
          /* Fallback: single judge display */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4 }}
            className="bg-black/40 border border-[#c9a84c]/20 rounded-sm p-4 mb-6 relative"
          >
            <Quote size={16} className="absolute top-3 left-3 text-[#c9a84c]/30" />
            <h4 className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-[#c9a84c]/70 mb-2 text-center">
              THE ALLFATHER&apos;S VERDICT
            </h4>
            <p className="font-[var(--font-rajdhani)] text-sm text-neutral-300 leading-relaxed text-center italic px-4">
              &quot;{reasoning}&quot;
            </p>
          </motion.div>
        )}

        {/* Responses Accordion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
        >
          <button
            onClick={() => setShowResponses(!showResponses)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-black/40 hover:bg-black/60 border border-neutral-800 hover:border-[#c9a84c]/30 rounded-sm transition-colors mb-4"
          >
            <span className="font-[var(--font-orbitron)] text-xs tracking-wider text-neutral-400">
              READ WARRIOR RESPONSES
            </span>
            {showResponses ? (
              <ChevronUp size={16} className="text-neutral-400" />
            ) : (
              <ChevronDown size={16} className="text-neutral-400" />
            )}
          </button>

          <AnimatePresence>
            {showResponses && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Agent A Response */}
                  <div className={`bg-black/40 border rounded-sm p-4 ${
                    agentA.isWinner ? 'border-[#c9a84c]/30' : 'border-neutral-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        agentA.isWinner
                          ? 'bg-[#c9a84c]/20 text-[#D4A843]'
                          : 'bg-neutral-700 text-neutral-400'
                      }`}>
                        {agentA.name.charAt(0)}
                      </div>
                      <span className={`font-[var(--font-orbitron)] text-xs tracking-wider ${
                        agentA.isWinner ? 'text-[#D4A843]' : 'text-neutral-400'
                      }`}>
                        {agentA.name}
                      </span>
                      {agentA.isWinner && (
                        <Crown size={12} className="text-[#D4A843]" />
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                      <p className="font-[var(--font-rajdhani)] text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                        {agentA.response}
                      </p>
                    </div>
                  </div>

                  {/* Agent B Response */}
                  <div className={`bg-black/40 border rounded-sm p-4 ${
                    agentB.isWinner ? 'border-[#c9a84c]/30' : 'border-neutral-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        agentB.isWinner
                          ? 'bg-[#c9a84c]/20 text-[#D4A843]'
                          : 'bg-neutral-700 text-neutral-400'
                      }`}>
                        {agentB.name.charAt(0)}
                      </div>
                      <span className={`font-[var(--font-orbitron)] text-xs tracking-wider ${
                        agentB.isWinner ? 'text-[#D4A843]' : 'text-neutral-400'
                      }`}>
                        {agentB.name}
                      </span>
                      {agentB.isWinner && (
                        <Crown size={12} className="text-[#D4A843]" />
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                      <p className="font-[var(--font-rajdhani)] text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                        {agentB.response}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8 }}
          className="flex flex-col sm:flex-row gap-3 mt-6"
        >
          {isHistorical ? (
            <button
              onClick={onDismiss}
              className="flex-1 py-4 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-sm hover:border-[#c9a84c]/40 hover:text-neutral-300 transition-colors"
            >
              CLOSE
            </button>
          ) : (
            <>
              <button
                onClick={onFightAgain}
                disabled={isLoading}
                className="flex-1 py-4 bg-gradient-to-r from-[#8a6d2b] via-[#a88a3d] to-[#8a6d2b] text-white font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:from-[#a88a3d] hover:via-[#c9a84c] hover:to-[#a88a3d] shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              >
                <Zap size={16} />
                FIGHT AGAIN
              </button>
              <button
                onClick={onDismiss}
                className="px-6 py-4 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.15em] rounded-sm hover:border-neutral-600 hover:text-neutral-300 transition-colors"
              >
                DISMISS
              </button>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
