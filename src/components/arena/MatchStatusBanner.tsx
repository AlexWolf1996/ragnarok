'use client';

interface MatchStatusBannerProps {
  status: string;
}

export default function MatchStatusBanner({ status }: MatchStatusBannerProps) {
  const config = getStatusConfig(status);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 border ${config.borderClass} ${config.bgClass}`}>
      <span className={`w-2 h-2 ${config.dotClass}`} />
      <span className={`font-[var(--font-rajdhani)] text-xs tracking-widest uppercase ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  );
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'betting_open':
      return {
        label: 'Betting Open — Place Your Predictions',
        dotClass: 'bg-[#D4A843] animate-pulse',
        textClass: 'text-[#D4A843]',
        borderClass: 'border-[#D4A843]/30',
        bgClass: 'bg-[#D4A843]/5',
      };
    case 'in_progress':
      return {
        label: 'Battle in Progress — Responses Streaming',
        dotClass: 'bg-red-500 animate-pulse',
        textClass: 'text-red-400',
        borderClass: 'border-red-500/30',
        bgClass: 'bg-red-500/5',
      };
    case 'judging':
      return {
        label: 'Judges Are Deliberating...',
        dotClass: 'bg-[#D4A843] animate-pulse',
        textClass: 'text-[#D4A843]',
        borderClass: 'border-[#D4A843]/30',
        bgClass: 'bg-[#D4A843]/5',
      };
    case 'completed':
      return {
        label: 'Battle Complete — Predictions Settled',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/30',
        bgClass: 'bg-emerald-500/5',
      };
    default:
      return {
        label: 'Waiting...',
        dotClass: 'bg-neutral-500',
        textClass: 'text-neutral-400',
        borderClass: 'border-neutral-700',
        bgClass: 'bg-neutral-800/20',
      };
  }
}
