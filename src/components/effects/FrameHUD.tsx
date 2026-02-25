'use client';

export default function FrameHUD() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* Top and bottom gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/70 to-transparent" />

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
