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

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="relative h-3 bg-[#1a1a1a] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-700"
          style={{
            width: `${pctA}%`,
            background: 'linear-gradient(90deg, #D4A843, #b8942f)',
          }}
        />
        <div
          className="absolute inset-y-0 right-0 transition-all duration-700"
          style={{
            width: `${pctB}%`,
            background: 'linear-gradient(90deg, #a63125, #c0392b)',
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[#D4A843]">{pctA}% backing</span>
        <span className="font-mono text-xs text-[#c0392b]">{pctB}% backing</span>
      </div>
    </div>
  );
}
