'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface GlitchTextProps {
  text: string;
  className?: string;
}

// Lightning bolt SVG paths for variety
const lightningPaths = [
  'M12 0 L8 12 L14 12 L6 28 L10 16 L4 16 Z',
  'M10 0 L6 10 L12 10 L4 24 L9 14 L3 14 Z',
  'M14 0 L10 8 L16 8 L8 20 L12 12 L6 12 Z',
];

interface LightningBolt {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  path: string;
  opacity: number;
}

function LightningEffect() {
  const [bolts, setBolts] = useState<LightningBolt[]>([]);
  const reducedMotion = useReducedMotion();

  const createBolt = useCallback(() => {
    const id = Date.now() + Math.random();
    const newBolt: LightningBolt = {
      id,
      x: Math.random() * 100,
      y: Math.random() * 60 + 20,
      scale: 0.8 + Math.random() * 0.6,
      rotation: -30 + Math.random() * 60,
      path: lightningPaths[Math.floor(Math.random() * lightningPaths.length)],
      opacity: 0.6 + Math.random() * 0.4,
    };

    setBolts(prev => [...prev, newBolt]);

    // Remove bolt after animation
    setTimeout(() => {
      setBolts(prev => prev.filter(b => b.id !== id));
    }, 400);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    // Initial lightning on mount
    const initialTimeout = setTimeout(() => {
      createBolt();
    }, 800);

    // Periodic lightning strikes
    const interval = setInterval(() => {
      // Random chance for lightning (roughly every 4-8 seconds)
      if (Math.random() < 0.3) {
        createBolt();
        // Sometimes double strike
        if (Math.random() < 0.3) {
          setTimeout(createBolt, 100);
        }
      }
    }, 2000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [createBolt, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Background flash on lightning */}
      {bolts.length > 0 && (
        <div className="absolute inset-0 lightning-flash" />
      )}

      {/* Lightning bolts */}
      {bolts.map(bolt => (
        <svg
          key={bolt.id}
          className="absolute lightning-bolt"
          style={{
            left: `${bolt.x}%`,
            top: `${bolt.y}%`,
            transform: `translate(-50%, -50%) scale(${bolt.scale}) rotate(${bolt.rotation}deg)`,
            opacity: bolt.opacity,
          }}
          width="28"
          height="56"
          viewBox="0 0 20 28"
          fill="none"
        >
          <path
            d={bolt.path}
            fill="url(#lightning-gradient)"
            filter="url(#lightning-glow)"
          />
          <defs>
            <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F5E6B8" />
              <stop offset="50%" stopColor="#D4A843" />
              <stop offset="100%" stopColor="#8B6914" />
            </linearGradient>
            <filter id="lightning-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      ))}

      {/* Electric arcs across text */}
      {bolts.map(bolt => (
        <div
          key={`arc-${bolt.id}`}
          className="absolute electric-arc"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: '50%',
            width: `${20 + Math.random() * 30}%`,
          }}
        />
      ))}
    </div>
  );
}

export default function GlitchText({
  text,
  className = '',
}: GlitchTextProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLSpanElement>(null);

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span ref={containerRef} className={`nordic-title-wrapper ${className}`}>
      {/* Lightning effects layer */}
      <LightningEffect />

      {/* Main text with aurora glow */}
      <span className="nordic-title" data-text={text}>
        {text}
      </span>
    </span>
  );
}
