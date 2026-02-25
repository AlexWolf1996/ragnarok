'use client';

export default function FrameHUD() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* Top and bottom gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/70 to-transparent" />

      {/* Corner frames */}
      <div className="absolute left-5 top-5 w-14 h-14 border border-red-600/40" />
      <div className="absolute right-5 top-5 w-14 h-14 border border-amber-500/30" />
      <div className="absolute left-5 bottom-5 w-14 h-14 border border-amber-500/30" />
      <div className="absolute right-5 bottom-5 w-14 h-14 border border-red-600/40" />

      {/* Corner accent lines - top left */}
      <div className="absolute left-6 top-6 w-28 h-[1px] bg-gradient-to-r from-red-600/50 to-transparent" />
      <div className="absolute left-6 top-6 h-28 w-[1px] bg-gradient-to-b from-red-600/50 to-transparent" />

      {/* Corner accent lines - top right */}
      <div className="absolute right-6 top-6 w-28 h-[1px] bg-gradient-to-l from-amber-500/40 to-transparent" />
      <div className="absolute right-6 top-6 h-28 w-[1px] bg-gradient-to-b from-amber-500/40 to-transparent" />

      {/* Corner accent lines - bottom left */}
      <div className="absolute left-6 bottom-6 w-28 h-[1px] bg-gradient-to-r from-amber-500/40 to-transparent" />
      <div className="absolute left-6 bottom-6 h-28 w-[1px] bg-gradient-to-t from-amber-500/40 to-transparent" />

      {/* Corner accent lines - bottom right */}
      <div className="absolute right-6 bottom-6 w-28 h-[1px] bg-gradient-to-l from-red-600/50 to-transparent" />
      <div className="absolute right-6 bottom-6 h-28 w-[1px] bg-gradient-to-t from-red-600/50 to-transparent" />

      {/* Status text - top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.35em] text-red-500/70 hidden md:block">
        SYS: ONLINE // SOLANA: MAINNET // RAGNAROK: ACTIVE
      </div>

      {/* Status text - bottom */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.35em] text-amber-500/60 hidden md:block">
        TARGET_LOCK: ENABLED // VOLATILITY: HIGH // MERCY: DISABLED
      </div>
    </div>
  );
}
