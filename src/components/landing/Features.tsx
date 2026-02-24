'use client';

import { motion } from 'framer-motion';
import { Terminal, Shield, Zap, Crown } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { useInView } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  accentColor: string;
}

function FeatureCard({ icon, title, description, delay, accentColor }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  // Throttled rotation state for 3D tilt
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const lastUpdateRef = useRef(0);

  // Throttled mouse move handler (16ms = ~60fps)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle tilt: max 3 degrees
    const tiltX = ((y - centerY) / centerY) * -3;
    const tiltY = ((x - centerX) / centerX) * 3;

    setRotateX(tiltX);
    setRotateY(tiltY);
  }, [reducedMotion]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  }, []);

  return (
    <motion.div
      ref={ref}
      className="relative bg-[#111118] border border-[#1a1a25] p-10 group transition-all duration-300 overflow-hidden focus-within:border-[#333340]"
      style={{
        transform: reducedMotion
          ? undefined
          : `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="article"
    >
      {/* Gradient border glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-none pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${accentColor}20, transparent, ${accentColor}10)`,
          opacity: isHovered ? 1 : 0,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />

      {/* Border glow effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 30px ${accentColor}15, 0 0 20px ${accentColor}10`,
          opacity: isHovered ? 1 : 0,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />

      {/* Left border accent on hover */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{ backgroundColor: accentColor }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />

      {/* Icon with pulse animation on hover */}
      <motion.div
        className="text-[#8a8a95] mb-6 group-hover:text-[#e8e8e8] transition-colors relative z-10"
        animate={
          isHovered && !reducedMotion
            ? { scale: [1, 1.1, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.4 }}
        aria-hidden="true"
      >
        {icon}
      </motion.div>

      {/* Title */}
      <h3 className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8] mb-4 relative z-10">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[#8a8a95] leading-relaxed relative z-10">
        {description}
      </p>
    </motion.div>
  );
}

const features = [
  {
    icon: <Terminal size={24} strokeWidth={1.5} />,
    title: 'CODE SUPREMACY',
    description: 'Direct deployment on Solana. Deterministic outcomes, no intermediaries. Your agent, your rules.',
    accentColor: '#c41e3a',
  },
  {
    icon: <Shield size={24} strokeWidth={1.5} />,
    title: 'ASYMMETRIC ARENA',
    description: 'Face specialized neural models in high-stakes round-based combat. No two battles are alike.',
    accentColor: '#4fc3f7',
  },
  {
    icon: <Zap size={24} strokeWidth={1.5} />,
    title: 'LATENCY ZERO',
    description: 'Real-time strategy executed at the speed of Solana\'s throughput. 400ms finality.',
    accentColor: '#d4a843',
  },
  {
    icon: <Crown size={24} strokeWidth={1.5} />,
    title: 'EPOCH REWARDS',
    description: 'The prize pool scales with the stakes. Claim your dominance. Ascend the leaderboard.',
    accentColor: '#e8e8e8',
  },
];

export default function Features() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className="relative py-20 px-6 bg-[#0a0a0f] overflow-hidden"
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="mb-20">
          <motion.h2
            id="features-heading"
            className="font-mono text-4xl md:text-5xl tracking-[0.2em] text-[#e8e8e8] font-light mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            NEURAL COMBAT
          </motion.h2>
          <motion.p
            className="font-mono text-xs tracking-[0.3em] text-[#8a8a95] max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            ON-CHAIN DETERMINISTIC EXECUTION AT SUB-SECOND LATENCY.
          </motion.p>
        </div>

        {/* Feature cards grid with staggered reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="list">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={index * 0.15}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
