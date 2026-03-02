'use client';

import type { MatchAgent } from '@/hooks/useCurrentMatch';

interface AgentCardProps {
  agent: MatchAgent;
  side: 'A' | 'B';
  odds: number;
  poolAmount: number;
  isSelected: boolean;
  clickable: boolean;
  onClick?: () => void;
}

export default function AgentCard({ agent, side, odds, poolAmount, isSelected, clickable, onClick }: AgentCardProps) {
  const borderColor = side === 'A' ? '#D4A843' : '#c0392b';
  const winRate = agent.wins + agent.losses > 0
    ? Math.round((agent.wins / (agent.wins + agent.losses)) * 100)
    : 0;

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`
        w-full text-left bg-black/40 backdrop-blur-sm border-2 p-4 sm:p-5 transition-all
        ${isSelected ? 'shadow-[0_0_20px_rgba(212,168,67,0.3)] bg-[#D4A843]/5' : ''}
        ${clickable ? 'cursor-pointer hover:bg-black/50 hover:shadow-[0_0_15px_rgba(212,168,67,0.15)]' : 'cursor-default'}
      `}
      style={{
        borderColor: isSelected ? borderColor : '#1a1a1a',
      }}
    >
      {/* Side label */}
      <div
        className="font-mono text-[10px] tracking-widest uppercase mb-3"
        style={{ color: borderColor }}
      >
        {side === 'A' ? 'CHAMPION A' : 'CHAMPION B'}
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-lg font-bold"
          style={{
            backgroundColor: `${borderColor}15`,
            border: `1px solid ${borderColor}40`,
            color: borderColor,
          }}
        >
          {agent.avatar_url ? (
            <span className="text-xl">{agent.avatar_url}</span>
          ) : (
            agent.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <div className="font-[var(--font-rajdhani)] text-base sm:text-lg text-white tracking-widest uppercase font-semibold">
            {agent.name}
          </div>
          <div className="font-mono text-xs text-neutral-500">
            ELO {agent.elo_rating}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs mb-3">
        <div>
          <span className="text-neutral-500 font-mono">W-L </span>
          <span className="text-white font-mono">{agent.wins}-{agent.losses}</span>
        </div>
        <div>
          <span className="text-neutral-500 font-mono">WR </span>
          <span className="text-white font-mono">{winRate}%</span>
        </div>
      </div>

      {/* Odds + Pool */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div>
          <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">ODDS</div>
          <div className="font-mono text-lg text-white">
            {odds > 0 ? `${odds.toFixed(2)}x` : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">POOL</div>
          <div className="font-mono text-sm text-neutral-300">
            {poolAmount > 0 ? `${poolAmount.toFixed(2)} SOL` : 'No bets yet'}
          </div>
        </div>
      </div>
    </button>
  );
}
