'use client';

import { useRecentMatches } from '@/hooks/useRecentMatches';
import type { RecentMatch } from '@/hooks/useRecentMatches';
import { Swords } from 'lucide-react';

export default function RecentMatchesFeed() {
  const { matches, loading } = useRecentMatches();

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-[#111] border border-[#1a1a1a] animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] p-6 text-center">
        <Swords size={24} className="text-neutral-600 mx-auto mb-2" />
        <p className="font-mono text-xs text-neutral-500">No recent battles</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {matches.slice(0, 5).map((match) => (
        <RecentMatchRow key={match.id} match={match} />
      ))}
    </div>
  );
}

function RecentMatchRow({ match }: { match: RecentMatch }) {
  const winnerIsA = match.winner_id === match.agent_a_id;
  const isUpset = (() => {
    if (!match.agentA || !match.agentB || !match.winner_id) return false;
    const winnerElo = winnerIsA ? match.agentA.elo_rating : match.agentB.elo_rating;
    const loserElo = winnerIsA ? match.agentB.elo_rating : match.agentA.elo_rating;
    return winnerElo < loserElo - 50;
  })();

  const timeAgo = match.completed_at ? getTimeAgo(match.completed_at) : '';

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#111] border border-[#1a1a1a] hover:border-neutral-700 transition-colors">
      {/* Agents */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-[var(--font-rajdhani)] text-xs tracking-wider uppercase truncate ${winnerIsA ? 'text-[#D4A843]' : 'text-neutral-400'}`}>
            {match.agentA?.name ?? '???'}
          </span>
          <span className="font-mono text-[10px] text-neutral-600">vs</span>
          <span className={`font-[var(--font-rajdhani)] text-xs tracking-wider uppercase truncate ${!winnerIsA ? 'text-[#c0392b]' : 'text-neutral-400'}`}>
            {match.agentB?.name ?? '???'}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="font-mono text-xs text-neutral-300 whitespace-nowrap">
        {match.agent_a_score ?? 0}:{match.agent_b_score ?? 0}
      </div>

      {/* Upset badge */}
      {isUpset && (
        <span className="font-mono text-[9px] text-red-400 border border-red-500/30 px-1 tracking-wider">UPSET</span>
      )}

      {/* Category */}
      {match.category && (
        <span className="font-mono text-[9px] text-neutral-600 uppercase hidden sm:inline">{match.category}</span>
      )}

      {/* Time ago */}
      <span className="font-mono text-[10px] text-neutral-600 whitespace-nowrap">{timeAgo}</span>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
