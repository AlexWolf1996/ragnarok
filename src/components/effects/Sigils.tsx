'use client';

import { useEffect, useState, useMemo } from 'react';

const RUNE_CHARS = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚬ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ',
  'ᛇ', 'ᛈ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛝ', 'ᛟ', 'ᛞ',
];

export default function Sigils({ density = 70 }: { density?: number }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate stable random values on mount
  const runes = useMemo(() => {
    if (!isMounted) return [];
    return Array.from({ length: density }).map((_, i) => ({
      id: i,
      char: RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)],
      opacity: 0.2 + Math.random() * 0.7,
    }));
  }, [density, isMounted]);

  if (!isMounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none opacity-[0.08] mix-blend-screen overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap justify-around items-center text-4xl md:text-5xl leading-none text-red-500/70 font-mono">
        {runes.map((rune) => (
          <span
            key={rune.id}
            className="mx-6 my-4 rotate-12"
            style={{ opacity: rune.opacity }}
          >
            {rune.char}
          </span>
        ))}
      </div>
    </div>
  );
}
