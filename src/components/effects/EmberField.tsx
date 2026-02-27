'use client';

import { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  blur: number;
  hue: number;
  drift: number;
}

export default function EmberField({ count = 120 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    // Reduce count on mobile and cap total particles
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const adjustedCount = isMobile ? Math.min(Math.floor(count * 0.3), 15) : Math.min(count, 40);

    setParticles(
      Array.from({ length: adjustedCount }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 8,
        size: 2 + Math.random() * 8,
        opacity: 0.3 + Math.random() * 0.6,
        blur: Math.random() * 2,
        hue: 20 + Math.random() * 40,
        drift: Math.random() * 120 - 60,
      }))
    );
  }, [count]);

  // Pause animations when off-screen
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '100px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ willChange: 'auto' }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-[-40px] rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            background: `radial-gradient(circle, hsla(${p.hue}, 100%, 65%, 1) 0%, hsla(8, 90%, 52%, 0.9) 38%, rgba(0,0,0,0) 75%)`,
            filter: p.blur > 0.5 ? `blur(${p.blur}px)` : undefined,
            animationName: 'ember-rise',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'linear',
            animationFillMode: 'both',
            animationPlayState: isVisible ? 'running' : 'paused',
            opacity: 0,
            ['--ember-drift' as string]: `${p.drift}px`,
            ['--ember-opacity' as string]: p.opacity,
          }}
        />
      ))}
    </div>
  );
}
