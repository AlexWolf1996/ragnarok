'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

  useEffect(() => {
    setIsMounted(true);
    // Reduce count on mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const adjustedCount = isMobile ? Math.floor(count * 0.4) : count;

    setParticles(
      Array.from({ length: adjustedCount }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 9,
        size: 2 + Math.random() * 12,
        opacity: 0.25 + Math.random() * 0.75,
        blur: Math.random() * 3.2,
        hue: 20 + Math.random() * 40,
        drift: Math.random() * 240 - 120,
      }))
    );
  }, [count]);

  // Prevent hydration mismatch
  if (!isMounted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute bottom-[-40px] rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            background: `radial-gradient(circle, hsla(${p.hue}, 100%, 65%, 1) 0%, hsla(8, 90%, 52%, 0.9) 38%, rgba(0,0,0,0) 75%)`,
            filter: `blur(${p.blur}px)`,
          }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{
            y: -1400,
            x: [0, p.drift, 0],
            opacity: [0, p.opacity, 0],
            scale: [0.9, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
