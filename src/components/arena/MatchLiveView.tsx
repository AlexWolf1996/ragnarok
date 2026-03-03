'use client';

import { useState, useEffect } from 'react';
import { useCurrentMatch } from '@/hooks/useCurrentMatch';
import { useMatchOdds } from '@/hooks/useMatchOdds';
import { useUpcomingMatches } from '@/hooks/useUpcomingMatches';
import { Swords, ScrollText } from 'lucide-react';
import AgentCard from './AgentCard';
import OddsDisplay from './OddsDisplay';
import CountdownTimer from './CountdownTimer';
import MatchStatusBanner from './MatchStatusBanner';
import MatchResult from './MatchResult';

interface MatchLiveViewProps {
  selectedSide: 'A' | 'B' | null;
  onSelectSide: (side: 'A' | 'B') => void;
}

export default function MatchLiveView({ selectedSide, onSelectSide }: MatchLiveViewProps) {
  const { match, loading, error, refresh } = useCurrentMatch();
  const { poolA, poolB, oddsA, oddsB, impliedA, impliedB } = useMatchOdds(
    match?.id ?? null,
    match?.status ?? null,
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton status bar */}
        <div className="h-8 bg-black/40 backdrop-blur-sm border border-neutral-800 animate-pulse" />
        {/* Skeleton agent cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-black/40 backdrop-blur-sm border border-neutral-800 p-5 space-y-3 animate-pulse">
            <div className="h-3 w-20 bg-neutral-800" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 bg-neutral-800" />
                <div className="h-3 w-16 bg-neutral-800" />
              </div>
            </div>
            <div className="h-3 w-32 bg-neutral-800" />
            <div className="h-8 w-full bg-neutral-800" />
          </div>
          <div className="bg-black/40 backdrop-blur-sm border border-neutral-800 p-5 space-y-3 animate-pulse">
            <div className="h-3 w-20 bg-neutral-800" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 bg-neutral-800" />
                <div className="h-3 w-16 bg-neutral-800" />
              </div>
            </div>
            <div className="h-3 w-32 bg-neutral-800" />
            <div className="h-8 w-full bg-neutral-800" />
          </div>
        </div>
        {/* Skeleton odds bar */}
        <div className="h-3 bg-[#1a1a1a] animate-pulse" />
        <p className="font-mono text-xs text-neutral-500 tracking-widest text-center">SCANNING THE ARENA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-neutral-800 p-8 text-center">
        <p className="font-mono text-xs text-red-400 mb-3">Failed to load match</p>
        <button
          onClick={refresh}
          className="font-mono text-xs text-neutral-400 border border-neutral-700 px-4 py-2 hover:border-[#D4A843] hover:text-[#D4A843] transition-colors"
        >
          RETRY
        </button>
      </div>
    );
  }

  // No active match
  if (!match) {
    return <NoMatchView />;
  }

  // Use live odds if available, otherwise fall back to match.odds
  // Use || instead of ?? so that backend 0 values also fall back to defaults
  const hasLiveOdds = poolA > 0 || poolB > 0;
  const displayOddsA = hasLiveOdds ? oddsA : (match.odds?.oddsA || 2.0);
  const displayOddsB = hasLiveOdds ? oddsB : (match.odds?.oddsB || 2.0);
  const displayPoolA = hasLiveOdds ? poolA : (match.odds?.poolA || 0);
  const displayPoolB = hasLiveOdds ? poolB : (match.odds?.poolB || 0);
  const displayImpliedA = hasLiveOdds ? impliedA : 50;
  const displayImpliedB = hasLiveOdds ? impliedB : 50;

  const isBettingOpen = match.status === 'betting_open';

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <MatchStatusBanner status={match.status} />

      {/* Challenge briefing */}
      <ChallengeBriefing
        category={match.category}
        challenge={match.challenge}
        status={match.status}
      />

      {/* Agent cards face-to-face */}
      {match.agentA && match.agentB && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AgentCard
            agent={match.agentA}
            side="A"
            odds={displayOddsA}
            poolAmount={displayPoolA}
            isSelected={selectedSide === 'A'}
            clickable={isBettingOpen}
            onClick={() => onSelectSide('A')}
          />
          <AgentCard
            agent={match.agentB}
            side="B"
            odds={displayOddsB}
            poolAmount={displayPoolB}
            isSelected={selectedSide === 'B'}
            clickable={isBettingOpen}
            onClick={() => onSelectSide('B')}
          />
        </div>
      )}

      {/* Odds bar */}
      <OddsDisplay impliedA={displayImpliedA} impliedB={displayImpliedB} />

      {/* Countdown (only during betting_open) */}
      {isBettingOpen && match.starts_at && (
        <div className="flex justify-center">
          <CountdownTimer
            targetDate={match.starts_at}
            label="Betting closes in"
            onExpired={refresh}
          />
        </div>
      )}

      {/* In-progress state */}
      {match.status === 'in_progress' && (
        <InProgressView agentAName={match.agentA?.name} agentBName={match.agentB?.name} startedAt={match.started_at} />
      )}

      {/* Judging state (mock for Phase 2a) */}
      {match.status === 'judging' && (
        <JudgingView />
      )}

      {/* Completed state */}
      {match.status === 'completed' && (
        <MatchResult match={match} />
      )}
    </div>
  );
}

function NoMatchView() {
  const { matches } = useUpcomingMatches();
  const next = matches[0];

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-neutral-800 p-8 sm:p-12 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a84c]/50 to-transparent" />
      <Swords size={32} className="text-[#c9a84c]/30 mx-auto mb-4" />
      <div className="font-[var(--font-rajdhani)] text-lg text-white tracking-widest uppercase mb-2">
        The Arena Awaits
      </div>
      <p className="font-mono text-xs text-neutral-500 mb-4">
        No active battle. The scheduler will summon the next match.
      </p>
      {next?.starts_at && (
        <div className="flex justify-center">
          <CountdownTimer targetDate={next.starts_at} label="Next match in" />
        </div>
      )}
      {next?.agentA && next?.agentB && (
        <div className="mt-4 font-mono text-xs text-neutral-400">
          <span className="text-[#D4A843]">{next.agentA.name}</span>
          {' vs '}
          <span className="text-[#c0392b]">{next.agentB.name}</span>
        </div>
      )}
    </div>
  );
}

function InProgressView({ agentAName, agentBName, startedAt }: { agentAName?: string; agentBName?: string; startedAt?: string | null }) {
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-red-500/20 p-6 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
      <div className="text-center mb-4 space-y-1">
        <span className="font-mono text-[10px] text-red-400 tracking-widest uppercase block">
          Battle in Progress
        </span>
        <span className="font-mono text-[9px] text-neutral-600 block">
          Agents are generating responses and judges are scoring...
        </span>
        {startedAt && (
          <ElapsedTime startedAt={startedAt} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-[#D4A843]/20 p-4" style={{ borderTop: '2px solid #D4A843' }}>
          <div className="font-mono text-[10px] text-[#D4A843] tracking-widest uppercase mb-2">{agentAName ?? 'Agent A'}</div>
          <div className="space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2 bg-neutral-800 animate-pulse" style={{ width: `${75 + i * 5}%`, animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
        <div className="border border-[#c0392b]/20 p-4" style={{ borderTop: '2px solid #c0392b' }}>
          <div className="font-mono text-[10px] text-[#c0392b] tracking-widest uppercase mb-2">{agentBName ?? 'Agent B'}</div>
          <div className="space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2 bg-neutral-800 animate-pulse" style={{ width: `${65 + i * 8}%`, animationDelay: `${i * 300}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function JudgingView() {
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-[#D4A843]/20 p-6 text-center shadow-[0_0_30px_rgba(201,168,76,0.1)]">
      <div className="font-mono text-[10px] text-[#D4A843] tracking-widest uppercase mb-2">
        Three judges deliberating...
      </div>
      <div className="font-mono text-[9px] text-neutral-600 mb-4">
        Scoring responses on creativity, accuracy, and style
      </div>
      <div className="flex justify-center gap-4">
        {['JUDGE I', 'JUDGE II', 'JUDGE III'].map((name, i) => (
          <div
            key={name}
            className="w-16 h-16 border border-[#D4A843]/30 flex items-center justify-center animate-pulse"
            style={{ animationDelay: `${i * 800}ms` }}
          >
            <span className="font-mono text-[9px] text-[#D4A843]/60 tracking-wider">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChallengeBriefing({
  category,
  challenge,
  status,
}: {
  category: string | null;
  challenge: { name: string; prompt: string | null; type: string; difficulty: string } | null;
  status: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const promptText = challenge?.prompt ?? null;
  const hasPrompt = !!promptText;

  // During betting, show the full challenge so users can make informed prophecies
  const showFull = status === 'betting_open' || expanded;

  if (!category && !challenge) return null;

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-[#c9a84c]/20 p-3 sm:p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <ScrollText size={12} className="text-[#c9a84c] flex-shrink-0" />
          <span className="font-mono text-[10px] text-[#c9a84c] tracking-widest uppercase">
            {category ?? challenge?.type ?? 'Challenge'}
          </span>
        </div>
        {challenge?.difficulty && (
          <span className="font-mono text-[10px] text-neutral-600 tracking-wider uppercase">
            {challenge.difficulty}
          </span>
        )}
      </div>

      {/* Challenge prompt */}
      {hasPrompt ? (
        <div>
          <p
            className={`font-[var(--font-rajdhani)] text-sm sm:text-base text-white leading-relaxed ${
              !showFull ? 'line-clamp-2' : ''
            }`}
          >
            {promptText}
          </p>
          {promptText && promptText.length > 120 && !showFull && (
            <button
              onClick={() => setExpanded(true)}
              className="font-mono text-[10px] text-[#c9a84c] hover:text-[#D4A843] mt-1 transition-colors"
            >
              Read full challenge
            </button>
          )}
        </div>
      ) : (
        <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400 italic">
          {challenge?.name ?? `${category} challenge`}
        </p>
      )}
    </div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <span className="font-mono text-[9px] text-neutral-500 block">
      Elapsed: {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}
