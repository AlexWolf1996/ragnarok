'use client';

import { useEffect, useState, useMemo } from 'react';

const RUNE_CHARS = [
  '\u16A0', '\u16A2', '\u16A6', '\u16AC', '\u16B1', '\u16B2', '\u16B7', '\u16B9', '\u16BA', '\u16BE', '\u16C1', '\u16C3',
  '\u16C7', '\u16C8', '\u16C9', '\u16CB', '\u16CF', '\u16D2', '\u16D6', '\u16D7', '\u16DA', '\u16DD', '\u16DF', '\u16DE',
];

export default function Sigils({ density = 70 }: { density?: number }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cap density and reduce on mobile
  const cappedDensity = useMemo(() => {
    if (!isMounted) return 0;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? Math.min(density, 20) : Math.min(density, 35);
  }, [density, isMounted]);

  // Generate stable random values on mount
  const runes = useMemo(() => {
    if (!isMounted) return [];
    return Array.from({ length: cappedDensity }).map((_, i) => ({
      id: i,
      char: RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)],
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }, [cappedDensity, isMounted]);

  if (!isMounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none opacity-[0.04] overflow-hidden">
      <div className="absolute inset-0 flex flex-wrap justify-around items-center text-4xl md:text-5xl leading-none text-amber-500/50 font-mono">
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
