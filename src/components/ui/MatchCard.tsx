'use client';

import { motion } from 'framer-motion';
import { Swords, Trophy, Clock } from 'lucide-react';
import { Tables } from '@/lib/supabase/types';
import { SolanaVerifiedBadge } from './SolanaTxLink';

type Agent = Tables<'agents'>;
type Challenge = Tables<'challenges'>;
type Match = Tables<'matches'> & {
  agent_a: Agent | null;
  agent_b: Agent | null;
  winner?: Agent | null;
  challenge: Challenge | null;
};

interface MatchCardProps {
  match: Match;
  isLive?: boolean;
  onBetClick?: (match: Match) => void;
  showBetButton?: boolean;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors = {
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-[#c9a84c]/10 text-[#D4A843] border-[#c9a84c]/30',
    hard: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-mono tracking-wider rounded border ${
        colors[difficulty as keyof typeof colors] || colors.medium
      }`}
    >
      {difficulty.toUpperCase()}
    </span>
  );
}

function ChallengeTypeBadge({ type }: { type: string }) {
  const formattedType = type.replace(/_/g, ' ').toUpperCase();
  return (
    <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider rounded bg-[#1a1a25] text-[#666670] border border-[#1a1a25]">
      {formattedType}
    </span>
  );
}

function TimeAgo({ date }: { date: string }) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeText = '';
  if (diffDays > 0) timeText = `${diffDays}d ago`;
  else if (diffHours > 0) timeText = `${diffHours}h ago`;
  else if (diffMins > 0) timeText = `${diffMins}m ago`;
  else timeText = 'Just now';

  return (
    <span className="text-[10px] font-mono text-[#666670] flex items-center gap-1">
      <Clock size={10} />
      {timeText}
    </span>
  );
}

export default function MatchCard({
  match,
  isLive = false,
  onBetClick,
  showBetButton = false,
}: MatchCardProps) {
  const agentA = match.agent_a;
  const agentB = match.agent_b;
  const winner = match.winner;
  const challenge = match.challenge;

  const isAgentAWinner = winner?.id === agentA?.id;
  const isAgentBWinner = winner?.id === agentB?.id;

  return (
    <motion.div
      className={`bg-[#111118] border border-[#1a1a25] rounded-sm p-4 ${
        isLive ? 'border-[#c41e3a]/50' : ''
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header badges */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {challenge && (
            <>
              <ChallengeTypeBadge type={challenge.type} />
              <DifficultyBadge difficulty={challenge.difficulty} />
            </>
          )}
        </div>
        {match.completed_at && <TimeAgo date={match.completed_at} />}
        {isLive && (
          <span className="text-[10px] font-mono text-[#c41e3a] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c41e3a] animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Agents */}
      <div className="flex items-center justify-between gap-4">
        {/* Agent A */}
        <div
          className={`flex-1 text-center p-3 rounded-sm border ${
            isAgentAWinner
              ? 'bg-[#d4a843]/10 border-[#d4a843]/30'
              : 'bg-[#0a0a0f] border-[#1a1a25]'
          }`}
        >
          {isAgentAWinner && (
            <Trophy className="w-4 h-4 text-[#d4a843] mx-auto mb-1" />
          )}
          <p
            className={`font-mono text-sm truncate ${
              isAgentAWinner ? 'text-[#d4a843]' : 'text-[#e8e8e8]'
            }`}
          >
            {agentA?.name || 'Unknown'}
          </p>
          <p className="text-[10px] font-mono text-[#666670] mt-1">
            ELO: {agentA?.elo_rating || '?'}
          </p>
          {match.agent_a_score !== null && (
            <p
              className={`text-lg font-mono font-light mt-1 ${
                isAgentAWinner ? 'text-[#d4a843]' : 'text-[#e8e8e8]'
              }`}
            >
              {match.agent_a_score}
            </p>
          )}
        </div>

        {/* VS / Battle indicator */}
        <div className="flex flex-col items-center">
          {isLive ? (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Swords className="w-6 h-6 text-[#c41e3a]" />
            </motion.div>
          ) : (
            <span className="font-mono text-xs text-[#666670]">VS</span>
          )}
        </div>

        {/* Agent B */}
        <div
          className={`flex-1 text-center p-3 rounded-sm border ${
            isAgentBWinner
              ? 'bg-[#d4a843]/10 border-[#d4a843]/30'
              : 'bg-[#0a0a0f] border-[#1a1a25]'
          }`}
        >
          {isAgentBWinner && (
            <Trophy className="w-4 h-4 text-[#d4a843] mx-auto mb-1" />
          )}
          <p
            className={`font-mono text-sm truncate ${
              isAgentBWinner ? 'text-[#d4a843]' : 'text-[#e8e8e8]'
            }`}
          >
            {agentB?.name || 'Unknown'}
          </p>
          <p className="text-[10px] font-mono text-[#666670] mt-1">
            ELO: {agentB?.elo_rating || '?'}
          </p>
          {match.agent_b_score !== null && (
            <p
              className={`text-lg font-mono font-light mt-1 ${
                isAgentBWinner ? 'text-[#d4a843]' : 'text-[#e8e8e8]'
              }`}
            >
              {match.agent_b_score}
            </p>
          )}
        </div>
      </div>

      {/* Solana verification badge */}
      {match.solana_tx_hash && (
        <div className="mt-4 flex justify-center">
          <SolanaVerifiedBadge txHash={match.solana_tx_hash} />
        </div>
      )}

      {/* Bet button */}
      {showBetButton && onBetClick && (match.status === 'pending' || match.status === 'in_progress') && (
        <button
          onClick={() => onBetClick(match)}
          className="w-full mt-4 py-2 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-xs tracking-[0.2em] rounded transition-all hover:bg-[#e8e8e8] hover:text-[#0a0a0f]"
        >
          PLACE BET
        </button>
      )}
    </motion.div>
  );
}
