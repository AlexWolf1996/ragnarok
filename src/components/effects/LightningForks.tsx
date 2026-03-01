'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function LightningForks() {
  const [delays, setDelays] = useState<{ d1: number; d2: number; d3: number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDelays({
        d1: Math.random() * 2,
        d2: Math.random() * 2 + 0.5,
        d3: Math.random() * 3 + 1,
      });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!delays) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-60">
      <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M 20% 0% Q 30% 20% 40% 50% T 50% 100%"
          stroke="rgba(245,158,11,0.8)"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: delays.d1,
          }}
          style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,1))' }}
        />
        <motion.path
          d="M 80% 0% Q 70% 30% 60% 60% T 50% 100%"
          stroke="rgba(220,38,38,0.8)"
          strokeWidth="4"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatDelay: delays.d2,
          }}
          style={{ filter: 'drop-shadow(0 0 10px rgba(220,38,38,1))' }}
        />
        <motion.path
          d="M 0% 50% Q 20% 40% 50% 50% T 100% 50%"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatDelay: delays.d3,
          }}
          style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,1))' }}
        />
      </svg>
    </div>
  );
}
