'use client';

import { useMemo } from 'react';

interface EloDataPoint {
  date: string;
  elo: number;
  matchId: string;
}

interface EloChartProps {
  data: EloDataPoint[];
  currentElo: number;
  height?: number;
}

export default function EloChart({ data, currentElo, height = 160 }: EloChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    // Add current ELO as final point
    const allPoints = [...data];
    if (allPoints.length > 0 && allPoints[allPoints.length - 1].elo !== currentElo) {
      allPoints.push({
        date: new Date().toISOString(),
        elo: currentElo,
        matchId: 'current',
      });
    }

    // Calculate bounds
    const elos = allPoints.map(d => d.elo);
    const minElo = Math.min(...elos);
    const maxElo = Math.max(...elos);
    const range = maxElo - minElo || 100;
    const padding = range * 0.1;

    return {
      points: allPoints,
      minElo: minElo - padding,
      maxElo: maxElo + padding,
      range: range + padding * 2,
    };
  }, [data, currentElo]);

  if (!chartData || chartData.points.length < 2) {
    return (
      <div
        className="flex items-center justify-center bg-black/20 rounded-sm border border-neutral-800"
        style={{ height }}
      >
        <p className="font-[var(--font-rajdhani)] text-xs text-neutral-500">
          Not enough data for chart
        </p>
      </div>
    );
  }

  const { points, minElo, range } = chartData;

  // Generate path
  const pathPoints = points.map((point, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = ((chartData.maxElo - point.elo) / range) * 100;
    return `${x},${y}`;
  });

  const linePath = `M ${pathPoints.join(' L ')}`;

  // Area fill path
  const areaPath = `M 0,100 L ${pathPoints.join(' L ')} L 100,100 Z`;

  // Calculate Y-axis labels
  const yLabels = [
    Math.round(chartData.maxElo),
    Math.round((chartData.maxElo + minElo) / 2),
    Math.round(minElo),
  ];

  // Get start and end ELO for delta
  const startElo = points[0].elo;
  const endElo = points[points.length - 1].elo;
  const delta = endElo - startElo;

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between py-2 pointer-events-none">
        {yLabels.map((label, i) => (
          <span key={i} className="font-mono text-[10px] text-neutral-600">
            {label}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="ml-12 h-full relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="#262630" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#262630" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#262630" strokeWidth="0.5" />

          {/* Area fill */}
          <defs>
            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={delta >= 0 ? '#f59e0b' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={delta >= 0 ? '#f59e0b' : '#ef4444'} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill="url(#eloGradient)"
          />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={delta >= 0 ? '#f59e0b' : '#ef4444'}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, i) => {
            const x = (i / (points.length - 1)) * 100;
            const y = ((chartData.maxElo - point.elo) / range) * 100;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill={delta >= 0 ? '#f59e0b' : '#ef4444'}
                className="opacity-70"
              />
            );
          })}

          {/* Current point (larger) */}
          <circle
            cx="100"
            cy={((chartData.maxElo - endElo) / range) * 100}
            r="3"
            fill={delta >= 0 ? '#f59e0b' : '#ef4444'}
            stroke="#0a0a12"
            strokeWidth="1"
          />
        </svg>

        {/* Delta badge */}
        <div className="absolute top-2 right-2">
          <span className={`font-mono text-xs px-2 py-1 rounded ${
            delta >= 0
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-12 flex justify-between mt-1">
        <span className="font-mono text-[10px] text-neutral-600">
          {new Date(points[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span className="font-mono text-[10px] text-neutral-600">
          Now
        </span>
      </div>
    </div>
  );
}
