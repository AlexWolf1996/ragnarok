'use client';

interface OddsDisplayProps {
  impliedA: number;
  impliedB: number;
}

export default function OddsDisplay({ impliedA, impliedB }: OddsDisplayProps) {
  // Ensure they sum to 100 for display
  const total = impliedA + impliedB;
  const pctA = total > 0 ? Math.round((impliedA / total) * 100) : 50;
  const pctB = 100 - pctA;

  // Both at 50% with no real data = no bets placed yet
  const noBets = impliedA === 50 && impliedB === 50;

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="relative h-3 bg-[#1a1a1a] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-700"
          style={{
            width: `${pctA}%`,
            background: noBets
              ? 'linear-gradient(90deg, #D4A84340, #b8942f40)'
              : 'linear-gradient(90deg, #D4A843, #b8942f)',
          }}
        />
        <div
          className="absolute inset-y-0 right-0 transition-all duration-700"
          style={{
            width: `${pctB}%`,
            background: noBets
              ? 'linear-gradient(90deg, #a6312540, #c0392b40)'
              : 'linear-gradient(90deg, #a63125, #c0392b)',
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        {noBets ? (
          <span className="font-mono text-xs text-neutral-600 mx-auto">No prophecies yet — be the first</span>
        ) : (
          <>
            <span className="font-mono text-xs text-[#D4A843]">{pctA}% backing</span>
            <span className="font-mono text-xs text-[#c0392b]">{pctB}% backing</span>
          </>
        )}
      </div>
    </div>
  );
}
