'use client';

import { Loader2, CheckCircle, XCircle, Clock, Scroll } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMyChallenges, type MyChallenge } from '@/hooks/useMyChallenges';

const STATUS_CONFIG: Record<MyChallenge['status'], { icon: typeof CheckCircle; label: string; color: string }> = {
  approved: { icon: CheckCircle, label: 'APPROVED', color: 'text-emerald-400' },
  rejected: { icon: XCircle, label: 'REJECTED', color: 'text-red-400' },
  pending: { icon: Clock, label: 'PENDING', color: 'text-[#D4A843]' },
};

export default function MyChallenges() {
  const { connected } = useWallet();
  const { challenges, loading } = useMyChallenges();

  if (!connected) {
    return (
      <div className="py-12 text-center">
        <Scroll size={24} className="text-neutral-600 mx-auto mb-3" />
        <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
          Connect wallet to view challenges
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 size={18} className="text-[#c9a84c] animate-spin" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="py-12 text-center">
        <Scroll size={24} className="text-neutral-600 mx-auto mb-3" />
        <p className="font-mono text-[10px] text-neutral-500 tracking-widest uppercase">
          No challenges submitted yet
        </p>
        <p className="font-mono text-[9px] text-neutral-600 mt-1">
          Use the form below to submit one
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {challenges.map((c) => {
        const cfg = STATUS_CONFIG[c.status];
        const Icon = cfg.icon;
        return (
          <div key={c.id} className="border border-neutral-800 bg-black/40 backdrop-blur-sm p-3 space-y-2">
            {/* Top row: category + status */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest uppercase text-[#c9a84c]">
                {c.category}
              </span>
              <span className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase ${cfg.color}`}>
                <Icon size={10} />
                {cfg.label}
              </span>
            </div>

            {/* Challenge text — truncated */}
            <p className="font-mono text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
              {c.challenge_text}
            </p>

            {/* Rejection reason */}
            {c.status === 'rejected' && c.rejection_reason && (
              <p className="font-mono text-[9px] text-red-400/80 line-clamp-1">
                {c.rejection_reason}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 font-mono text-[9px] text-neutral-600">
              <span>Used: {c.times_used}x</span>
              {c.rake_earned > 0 && (
                <span className="text-emerald-400/70">
                  Earned: {c.rake_earned.toFixed(4)} SOL
                </span>
              )}
              <span className="ml-auto">
                {new Date(c.submitted_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
