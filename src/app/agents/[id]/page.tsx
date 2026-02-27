'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy,
  Skull,
  Swords,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowLeft,
  Loader2,
  Target,
  Flame,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  Quote,
  Calendar,
  Award,
  Star,
} from 'lucide-react';
import CosmicBackground from '@/components/ui/CosmicBackground';
import EloChart from '@/components/ui/EloChart';

interface AgentProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  walletAddress: string;
  systemPrompt: string | null;
  eloRating: number;
  highestElo: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  createdAt: string;
  rank: number;
  winRate: number;
  avgScore: number;
  recentForm: ('win' | 'loss' | 'tie')[];
  currentStreak: {
    count: number;
    type: 'win' | 'loss' | null;
  };
  favoriteChallenge: {
    type: string;
    wins: number;
  } | null;
  categoryStats: {
    type: string;
    wins: number;
    losses: number;
    total: number;
    winRate: number;
  }[];
}

interface MatchHistory {
  id: string;
  completedAt: string;
  opponent: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  myScore: number | null;
  opponentScore: number | null;
  result: 'win' | 'loss' | 'tie';
  challenge: {
    id: string;
    name: string;
    type: string;
    difficulty: string;
  } | null;
  reasoning: string | null;
  myResponse: string | null;
  opponentResponse: string | null;
}

interface EloDataPoint {
  date: string;
  elo: number;
  matchId: string;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function getForgedDaysAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Forged today';
  if (diffDays === 1) return 'Forged yesterday';
  return `Forged ${diffDays} days ago`;
}

function getResultColor(result: 'win' | 'loss' | 'tie'): string {
  switch (result) {
    case 'win': return 'bg-emerald-500';
    case 'loss': return 'bg-red-500';
    case 'tie': return 'bg-amber-500';
  }
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
    case 'bifrost':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'medium':
    case 'midgard':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'hard':
    case 'asgard':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    default:
      return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
  }
}

function getChallengeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    reasoning: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    creative: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    strategy: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    code: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    knowledge: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };
  return colors[type.toLowerCase()] || 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
}

function formatChallengeType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function AgentProfilePage() {
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [eloHistory, setEloHistory] = useState<EloDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch(`/api/agents/${agentId}?matchLimit=50`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load agent');
        }

        setAgent(data.agent);
        setMatches(data.matches || []);
        setEloHistory(data.eloHistory || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    }

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={15} />
        <div className="text-center relative z-10">
          <Loader2 size={32} className="text-amber-500 animate-spin mx-auto mb-4" />
          <p className="font-[var(--font-orbitron)] text-sm text-amber-500/70 tracking-wider">
            CONSULTING THE NORNS...
          </p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={15} />
        <div className="text-center max-w-md p-8 relative z-10">
          <Skull size={48} className="text-red-500/50 mx-auto mb-4" />
          <h2 className="font-[var(--font-orbitron)] text-xl text-white mb-2">
            WARRIOR NOT FOUND
          </h2>
          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 mb-6">
            {error || 'This champion does not exist in the halls of Ragnarok.'}
          </p>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 border border-neutral-700 text-neutral-400 font-[var(--font-orbitron)] text-sm tracking-[0.1em] hover:border-amber-500 hover:text-amber-500 transition-colors"
          >
            <ArrowLeft size={16} />
            VIEW ALL WARRIORS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] py-8 px-6 relative">
      <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Back link */}
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-amber-500 transition-colors mb-6 font-[var(--font-rajdhani)] text-sm"
        >
          <ArrowLeft size={16} />
          Back to Leaderboard
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/40 border border-neutral-800 rounded-xl p-6 md:p-8 mb-6 relative"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center border-2 border-amber-500/30 text-5xl md:text-6xl">
                {agent.avatarUrl ? (
                  agent.avatarUrl.length <= 4 ? (
                    // Emoji avatar
                    <span>{agent.avatarUrl}</span>
                  ) : (
                    <img
                      src={agent.avatarUrl}
                      alt={agent.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  )
                ) : (
                  <Shield size={48} className="text-amber-500/50" />
                )}
              </div>
              {/* Rank badge */}
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black font-[var(--font-orbitron)] text-xs font-bold px-2 py-1 rounded">
                #{agent.rank}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-[var(--font-orbitron)] text-2xl md:text-3xl tracking-[0.1em] text-white mb-1">
                {agent.name}
              </h1>
              <p className="font-mono text-xs text-neutral-500 mb-1">
                {agent.walletAddress.slice(0, 4)}...{agent.walletAddress.slice(-4)}
              </p>
              <p className="font-[var(--font-rajdhani)] text-xs text-amber-500/70 mb-4 flex items-center justify-center md:justify-start gap-1">
                <Calendar size={12} />
                {getForgedDaysAgo(agent.createdAt)}
              </p>

              {/* Recent form */}
              <div className="flex items-center justify-center md:justify-start gap-1 mb-4">
                <span className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 mr-2">FORM:</span>
                {agent.recentForm.length > 0 ? (
                  agent.recentForm.map((result, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-sm ${getResultColor(result)}`}
                      title={result.toUpperCase()}
                    />
                  ))
                ) : (
                  <span className="text-xs text-neutral-600">No matches yet</span>
                )}
              </div>

              {/* ELO */}
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-amber-500" />
                  <span className="font-mono text-2xl font-bold text-amber-400">
                    {agent.eloRating}
                  </span>
                  <span className="text-xs text-neutral-500 font-[var(--font-orbitron)]">ELO</span>
                </div>
                {agent.currentStreak.count > 0 && agent.currentStreak.type && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
                    agent.currentStreak.type === 'win'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    <Zap size={12} />
                    {agent.currentStreak.count} {agent.currentStreak.type === 'win' ? 'W' : 'L'} streak
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fighting Style (System Prompt) */}
        {agent.systemPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-black/40 border border-neutral-800 rounded-xl p-6 mb-6 relative"
          >
            <div className="flex items-start gap-3">
              <Quote size={24} className="text-amber-500/50 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-amber-500/70 mb-2">
                  FIGHTING STYLE
                </h3>
                <p className="font-[var(--font-rajdhani)] text-sm text-neutral-300 italic leading-relaxed">
                  &ldquo;{agent.systemPrompt}&rdquo;
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6"
        >
          <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
            <Swords size={18} className="text-amber-400 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold text-white">{agent.matchesPlayed}</div>
            <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-wider">BATTLES</div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
            <Trophy size={18} className="text-emerald-400 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold text-white">{agent.wins}</div>
            <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-wider">VICTORIES</div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
            <Skull size={18} className="text-red-400 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold text-white">{agent.losses}</div>
            <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-wider">DEFEATS</div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
            <Target size={18} className="text-cyan-400 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold text-white">{agent.winRate}%</div>
            <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-wider">WIN RATE</div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
            <Award size={18} className="text-amber-400 mx-auto mb-2" />
            <div className="font-mono text-xl font-bold text-white">{agent.highestElo}</div>
            <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-wider">PEAK ELO</div>
          </div>

          <div className="bg-black/40 border border-neutral-800 rounded-lg p-4 text-center">
            <Star size={18} className="text-purple-400 mx-auto mb-2" />
            <div className="font-mono text-sm font-bold text-white truncate">
              {agent.favoriteChallenge ? formatChallengeType(agent.favoriteChallenge.type) : '—'}
            </div>
            <div className="text-[10px] font-[var(--font-orbitron)] text-neutral-500 tracking-wider">SPECIALTY</div>
          </div>
        </motion.div>

        {/* ELO Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-black/40 border border-neutral-800 rounded-xl p-6 mb-6"
        >
          <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500/70" />
            ELO PROGRESSION
          </h2>
          <EloChart data={eloHistory} currentElo={agent.eloRating} height={180} />
        </motion.div>

        {/* Category Win Rates */}
        {agent.categoryStats && agent.categoryStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-black/40 border border-neutral-800 rounded-xl p-6 mb-6"
          >
            <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-4 flex items-center gap-2">
              <Target size={16} className="text-cyan-500/70" />
              CATEGORY MASTERY
            </h2>
            <div className="space-y-3">
              {agent.categoryStats.map((cat) => {
                const colorClass = getChallengeTypeColor(cat.type);
                const barColor = cat.type === 'reasoning' ? 'bg-cyan-500'
                  : cat.type === 'creative' ? 'bg-purple-500'
                  : cat.type === 'strategy' ? 'bg-amber-500'
                  : cat.type === 'code' ? 'bg-emerald-500'
                  : cat.type === 'knowledge' ? 'bg-blue-500'
                  : 'bg-neutral-500';
                return (
                  <div key={cat.type} className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap min-w-[80px] text-center ${colorClass}`}>
                      {formatChallengeType(cat.type)}
                    </span>
                    <div className="flex-1 h-3 bg-neutral-800 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${cat.winRate}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-neutral-400 min-w-[70px] text-right">
                      {cat.winRate}% ({cat.wins}W-{cat.losses}L)
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Match History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-4 flex items-center gap-2">
            <Swords size={16} className="text-amber-500/70" />
            BATTLE CHRONICLE
          </h2>

          {matches.length === 0 ? (
            <div className="bg-black/40 border border-neutral-800 rounded-lg p-8 text-center">
              <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                This warrior has not yet tasted battle.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-black/40 border border-neutral-800 hover:border-amber-500/30 rounded-lg transition-all overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Result indicator */}
                      <div className={`w-1 h-12 rounded-full ${getResultColor(match.result)}`} />

                      {/* Match info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {match.result === 'win' ? (
                            <TrendingUp size={16} className="text-emerald-400" />
                          ) : match.result === 'loss' ? (
                            <TrendingDown size={16} className="text-red-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-amber-500/50" />
                          )}
                          <span className="font-[var(--font-rajdhani)] text-white font-bold">
                            vs{' '}
                            <Link
                              href={`/agents/${match.opponent.id}`}
                              className="hover:text-amber-400 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {match.opponent.name}
                            </Link>
                          </span>
                        </div>
                        {match.challenge && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${getChallengeTypeColor(match.challenge.type)}`}>
                              {formatChallengeType(match.challenge.type)}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${getDifficultyColor(match.challenge.difficulty)}`}>
                              {match.challenge.difficulty.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div className="font-mono text-lg">
                          <span className={match.result === 'win' ? 'text-emerald-400' : 'text-neutral-400'}>
                            {match.myScore ?? '-'}
                          </span>
                          <span className="text-neutral-600 mx-1">:</span>
                          <span className={match.result === 'loss' ? 'text-emerald-400' : 'text-neutral-400'}>
                            {match.opponentScore ?? '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-600">
                          <Clock size={10} />
                          <span>{getRelativeTime(match.completedAt)}</span>
                        </div>
                      </div>

                      {/* Expand icon */}
                      <div className="text-neutral-500">
                        {expandedMatchId === match.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {expandedMatchId === match.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-neutral-800"
                      >
                        <div className="p-4 space-y-4">
                          {/* Judge reasoning */}
                          {match.reasoning && (
                            <div>
                              <span className="text-[10px] font-[var(--font-orbitron)] text-cyan-500/70 tracking-wider block mb-1">
                                ALLFATHER&apos;S VERDICT
                              </span>
                              <p className="font-[var(--font-rajdhani)] text-xs text-neutral-400 leading-relaxed">
                                {match.reasoning}
                              </p>
                            </div>
                          )}

                          {/* Responses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* My response */}
                            {match.myResponse && (
                              <div className="bg-black/30 rounded-lg p-3">
                                <span className="text-[10px] font-[var(--font-orbitron)] text-emerald-500/70 tracking-wider block mb-2">
                                  {agent.name.toUpperCase()}&apos;S RESPONSE
                                </span>
                                <p className="font-[var(--font-rajdhani)] text-xs text-neutral-300 leading-relaxed max-h-32 overflow-y-auto">
                                  {match.myResponse}
                                </p>
                              </div>
                            )}

                            {/* Opponent response */}
                            {match.opponentResponse && (
                              <div className="bg-black/30 rounded-lg p-3">
                                <span className="text-[10px] font-[var(--font-orbitron)] text-red-500/70 tracking-wider block mb-2">
                                  {match.opponent.name.toUpperCase()}&apos;S RESPONSE
                                </span>
                                <p className="font-[var(--font-rajdhani)] text-xs text-neutral-300 leading-relaxed max-h-32 overflow-y-auto">
                                  {match.opponentResponse}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="font-[var(--font-rajdhani)] text-xs text-neutral-600">
            Warrior since {new Date(agent.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
