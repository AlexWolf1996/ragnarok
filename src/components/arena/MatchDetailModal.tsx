'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import BattleResultDisplay from './BattleResultDisplay';

interface MatchAgent {
  id: string;
  name: string;
  avatar_url: string | null;
  elo_rating: number;
}

interface MatchChallenge {
  id: string;
  name: string;
  type: string;
  difficulty_level: string;
  prompt: unknown; // Json field — could be string or object
}

interface JudgeScore {
  judge_id?: string;
  judge_name?: string;
  model?: string;
  score_a?: number;
  score_b?: number;
  winner?: string;
  reasoning?: string;
  failed?: boolean;
}

interface MatchDetail {
  id: string;
  status: string;
  agent_a_id: string;
  agent_b_id: string;
  winner_id: string | null;
  agent_a_score: number | null;
  agent_b_score: number | null;
  agent_a_response: unknown;
  agent_b_response: unknown;
  judge_scores: unknown;
  judge_reasoning: string | null;
  is_split_decision: boolean | null;
  is_unanimous: boolean | null;
  agentA: MatchAgent | null;
  agentB: MatchAgent | null;
  challenge: MatchChallenge | null;
}

function extractResponse(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'content' in raw) {
    return String((raw as { content: unknown }).content);
  }
  if (raw) return JSON.stringify(raw);
  return 'No response recorded';
}

function extractPrompt(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'prompt' in raw) {
    return String((raw as { prompt: unknown }).prompt);
  }
  if (raw && typeof raw === 'object' && 'text' in raw) {
    return String((raw as { text: unknown }).text);
  }
  if (raw) return JSON.stringify(raw);
  return 'Unknown challenge';
}

function parseJudgeScores(raw: unknown): {
  judgeId: string;
  judgeName: string;
  model: string;
  scoreA: number;
  scoreB: number;
  winnerId: 'A' | 'B' | 'TIE';
  reasoning: string;
  failed: boolean;
}[] {
  if (!Array.isArray(raw)) return [];

  return (raw as JudgeScore[]).map((j) => ({
    judgeId: j.judge_id ?? 'unknown',
    judgeName: j.judge_name ?? j.judge_id ?? 'Unknown',
    model: j.model ?? '',
    scoreA: j.score_a ?? 0,
    scoreB: j.score_b ?? 0,
    winnerId: j.winner === 'A' ? 'A' : j.winner === 'B' ? 'B' : 'TIE',
    reasoning: j.reasoning ?? '',
    failed: j.failed ?? false,
  }));
}

interface MatchDetailModalProps {
  matchId: string | null;
  onClose: () => void;
}

export default function MatchDetailModal({ matchId, onClose }: MatchDetailModalProps) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatch = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to load match');
        return;
      }
      setMatch(json.match);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (matchId) {
      fetchMatch(matchId);
    } else {
      setMatch(null);
      setError(null);
    }
  }, [matchId, fetchMatch]);

  // Close on Escape key
  useEffect(() => {
    if (!matchId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [matchId, onClose]);

  const agentA = match?.agentA;
  const agentB = match?.agentB;

  return (
    <AnimatePresence>
      {matchId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-3xl mx-4 my-8"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 z-20 w-8 h-8 flex items-center justify-center bg-black border border-neutral-700 hover:border-[#c9a84c] transition-colors"
            >
              <X size={14} className="text-neutral-400" />
            </button>

            {loading && (
              <div className="bg-black/90 border border-[#c9a84c]/20 rounded-sm p-12 text-center">
                <Loader2 size={28} className="text-[#c9a84c] animate-spin mx-auto mb-3" />
                <p className="font-[var(--font-orbitron)] text-xs tracking-widest text-[#c9a84c]/60">
                  LOADING BATTLE RECORD...
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-black/90 border border-red-500/30 rounded-sm p-8 text-center">
                <p className="font-mono text-sm text-red-400">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 border border-neutral-700 text-neutral-400 font-mono text-xs hover:border-neutral-500 transition-colors"
                >
                  CLOSE
                </button>
              </div>
            )}

            {match && !loading && !error && agentA && agentB && (
              <BattleResultDisplay
                agentA={{
                  id: agentA.id,
                  name: agentA.name,
                  score: match.agent_a_score ?? 0,
                  elo: agentA.elo_rating,
                  newElo: agentA.elo_rating,
                  eloDelta: 0,
                  isWinner: match.winner_id === agentA.id,
                  response: extractResponse(match.agent_a_response),
                }}
                agentB={{
                  id: agentB.id,
                  name: agentB.name,
                  score: match.agent_b_score ?? 0,
                  elo: agentB.elo_rating,
                  newElo: agentB.elo_rating,
                  eloDelta: 0,
                  isWinner: match.winner_id === agentB.id,
                  response: extractResponse(match.agent_b_response),
                }}
                challenge={{
                  id: match.challenge?.id ?? '',
                  name: match.challenge?.name ?? 'Unknown Challenge',
                  type: match.challenge?.type ?? 'unknown',
                  difficulty: match.challenge?.difficulty_level ?? 'unknown',
                  prompt: match.challenge ? extractPrompt(match.challenge.prompt) : 'Challenge details unavailable',
                }}
                reasoning={match.judge_reasoning ?? ''}
                judges={parseJudgeScores(match.judge_scores)}
                isSplitDecision={match.is_split_decision ?? false}
                isUnanimous={match.is_unanimous ?? false}
                onFightAgain={onClose}
                onDismiss={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
