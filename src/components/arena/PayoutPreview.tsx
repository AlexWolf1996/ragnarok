'use client';

interface PayoutPreviewProps {
  odds: number;
  betAmount: number;
  agentName?: string;
}

export default function PayoutPreview({ odds, betAmount, agentName }: PayoutPreviewProps) {
  const potentialReturn = odds * betAmount;

  return (
    <div className="bg-[#0d0d0d] border border-emerald-500/20 px-3 py-2">
      <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase mb-1">
        Potential Return
      </div>
      <div className="font-mono text-sm text-emerald-400">
        {odds > 0 ? `${potentialReturn.toFixed(4)} SOL` : '— SOL'}
      </div>
      <div className="font-mono text-[9px] text-neutral-600 mt-1">
        If {agentName ?? 'your champion'} wins → {odds > 0 ? `${odds.toFixed(2)}x` : '—'}
      </div>
    </div>
  );
}
