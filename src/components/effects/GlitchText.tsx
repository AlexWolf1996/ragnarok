'use client';

import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface GlitchTextProps {
  text: string;
  className?: string;
  glitchOnMount?: boolean;
  periodicGlitch?: boolean;
  periodicInterval?: number;
}

export default function GlitchText({
  text,
  className = '',
  glitchOnMount = true,
  periodicGlitch = true,
  periodicInterval = 5000,
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const reducedMotion = useReducedMotion();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (reducedMotion) return;

    // Glitch on mount
    if (glitchOnMount && !mountedRef.current) {
      mountedRef.current = true;
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 500);
    }

    // Periodic subtle glitches
    if (periodicGlitch) {
      const interval = setInterval(() => {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 200);
      }, periodicInterval);

      return () => clearInterval(interval);
    }
  }, [glitchOnMount, periodicGlitch, periodicInterval, reducedMotion]);

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`glitch-wrapper ${className}`}>
      <span
        className={`glitch-text ${isGlitching ? 'glitching' : ''}`}
        data-text={text}
      >
        {text}
      </span>
    </span>
  );
}
