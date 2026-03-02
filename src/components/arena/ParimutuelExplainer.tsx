'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ParimutuelExplainerProps {
  poolA: number;
  poolB: number;
  agentAName?: string;
  agentBName?: string;
}

const RAKE = 0.05;

export default function ParimutuelExplainer({ poolA, poolB, agentAName, agentBName }: ParimutuelExplainerProps) {
  const [open, setOpen] = useState(false);

  const total = poolA + poolB;
  const rakeAmount = total * RAKE;
  const prizePool = total - rakeAmount;
  const payoutA = poolA > 0 ? prizePool / poolA : 0;
  const payoutB = poolB > 0 ? prizePool / poolB : 0;

  return (
    <div className="border border-neutral-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <span className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
          How do odds work?
        </span>
        <ChevronDown
          size={12}
          className={`text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Pool breakdown */}
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-[#D4A843]">Pool {agentAName ?? 'A'}</span>
              <span className="text-neutral-300">{poolA.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-[#c0392b]">Pool {agentBName ?? 'B'}</span>
              <span className="text-neutral-300">{poolB.toFixed(4)} SOL</span>
            </div>
            <div className="border-t border-neutral-800 my-1" />
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-neutral-500">Total Pool</span>
              <span className="text-neutral-300">{total.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-neutral-500">Rake (5%)</span>
              <span className="text-neutral-400">-{rakeAmount.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-neutral-500">Prize Pool</span>
              <span className="text-emerald-400">{prizePool.toFixed(4)} SOL</span>
            </div>
          </div>

          {/* Payout scenarios */}
          <div className="space-y-1">
            <div className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">Payouts</div>
            <div className="font-mono text-[10px] text-[#D4A843]">
              If {agentAName ?? 'A'} wins → {payoutA.toFixed(2)}x payout
            </div>
            <div className="font-mono text-[10px] text-[#c0392b]">
              If {agentBName ?? 'B'} wins → {payoutB.toFixed(2)}x payout
            </div>
          </div>

          {/* Explainer text */}
          <p className="font-mono text-[9px] text-neutral-600 leading-relaxed">
            All bets go into one pool. Treasury takes 5%. The rest goes to winners
            proportionally based on their share of the winning side&apos;s pool.
          </p>
        </div>
      )}
    </div>
  );
}
