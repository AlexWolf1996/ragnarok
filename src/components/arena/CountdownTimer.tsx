'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
  onExpired?: () => void;
}

export default function CountdownTimer({ targetDate, label = 'Prophecy window closes in', onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeLeft(targetDate);
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpired]);

  const isUrgent = timeLeft.total > 0 && timeLeft.total < 60_000;
  const isExpired = timeLeft.total <= 0;

  if (isExpired) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 animate-pulse" />
        <span className="font-mono text-xs text-red-400 tracking-widest uppercase">Time&apos;s up</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-[var(--font-rajdhani)] text-xs text-neutral-500 tracking-widest uppercase">{label}</span>
      <span
        className={`font-mono text-sm tracking-wider ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white'}`}
      >
        {timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { total: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    minutes: Math.floor(diff / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}
