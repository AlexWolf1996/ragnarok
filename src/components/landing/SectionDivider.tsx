'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface SectionDividerProps {
  variant?: 'fade' | 'line' | 'gradient';
  accentColor?: 'gold' | 'cyan' | 'red' | 'none';
  className?: string;
}

export default function SectionDivider({
  variant = 'fade',
  accentColor = 'none',
  className = '',
}: SectionDividerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const accentColors = {
    gold: '#d4a843',
    cyan: '#4fc3f7',
    red: '#c41e3a',
    none: 'transparent',
  };

  const accent = accentColors[accentColor];

  if (variant === 'fade') {
    return (
      <div
        ref={ref}
        className={`relative h-8 overflow-hidden ${className}`}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f] to-transparent"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
        {accentColor !== 'none' && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={isInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        )}
      </div>
    );
  }

  if (variant === 'line') {
    return (
      <div ref={ref} className={`py-4 ${className}`}>
        <motion.div
          className="max-w-4xl mx-auto h-px"
          style={{
            background:
              accentColor !== 'none'
                ? `linear-gradient(90deg, transparent, ${accent}30, #1a1a25, ${accent}30, transparent)`
                : 'linear-gradient(90deg, transparent, #1a1a25, transparent)',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={isInView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </div>
    );
  }

  if (variant === 'gradient') {
    return (
      <div
        ref={ref}
        className={`relative h-12 overflow-hidden ${className}`}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              accentColor !== 'none'
                ? `radial-gradient(ellipse at center, ${accent}08 0%, transparent 70%)`
                : 'radial-gradient(ellipse at center, #1a1a25 0%, transparent 70%)',
          }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        />
        {/* Decorative horizontal lines */}
        <motion.div
          className="absolute top-1/2 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              accentColor !== 'none' ? accent : '#1a1a25'
            }20, transparent)`,
          }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        />
      </div>
    );
  }

  return null;
}
