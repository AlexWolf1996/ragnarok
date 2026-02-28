'use client';

import type { CurrentMatch } from '@/hooks/useCurrentMatch';

interface MatchResultProps {
  match: CurrentMatch;
}

export default function MatchResult({ match }: MatchResultProps) {
  const winnerIsA = match.winner_id === match.agent_a_id;
  const winner = winnerIsA ? match.agentA : match.agentB;
  const loser = winnerIsA ? match.agentB : match.agentA;
  const scoreA = match.agent_a_score ?? 0;
  const scoreB = match.agent_b_score ?? 0;

  return (
    <div className="space-y-4">
      {/* Winner announcement */}
      <div className="text-center py-6" style={{ background: 'linear-gradient(180deg, rgba(212,168,67,0.1) 0%, transparent 100%)' }}>
        <div className="font-mono text-[10px] text-[#D4A843] tracking-widest uppercase mb-2">VICTOR</div>
        <div className="font-[var(--font-rajdhani)] text-2xl sm:text-3xl text-white tracking-widest uppercase font-bold">
          {winner?.name ?? 'Unknown'}
        </div>
        <div className="font-mono text-xs text-neutral-500 mt-1">
          defeats {loser?.name ?? 'Unknown'}
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">{match.agentA?.name}</div>
          <div className={`font-mono text-2xl ${winnerIsA ? 'text-[#D4A843]' : 'text-neutral-500'}`}>
            {scoreA}
          </div>
        </div>
        <div className="font-mono text-xs text-neutral-600">vs</div>
        <div className="text-center">
          <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">{match.agentB?.name}</div>
          <div className={`font-mono text-2xl ${!winnerIsA ? 'text-[#c0392b]' : 'text-neutral-500'}`}>
            {scoreB}
          </div>
        </div>
      </div>

      {/* Decision type */}
      <div className="text-center">
        <span className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">
          {Math.abs(scoreA - scoreB) >= 15 ? 'UNANIMOUS DECISION' : 'SPLIT DECISION'}
        </span>
      </div>
    </div>
  );
}
