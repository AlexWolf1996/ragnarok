'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import GlitchText from '@/components/effects/GlitchText';
import ParticleField from '@/components/effects/ParticleField';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Target date: 14 days from a fixed reference
const TARGET_DATE = new Date('2026-03-09T18:00:00Z');

interface CountdownBlockProps {
  value: number;
  label: string;
  isSeconds?: boolean;
}

function CountdownBlock({ value, label, isSeconds }: CountdownBlockProps) {
  const prevValueRef = useRef(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (value !== prevValueRef.current) {
      if (!reducedMotion) {
        const flipTimeout = setTimeout(() => setIsFlipping(true), 0);
        const resetTimeout = setTimeout(() => setIsFlipping(false), 300);
        prevValueRef.current = value;
        return () => {
          clearTimeout(flipTimeout);
          clearTimeout(resetTimeout);
        };
      }
      prevValueRef.current = value;
    }
  }, [value, reducedMotion]);

  return (
    <div className="text-center">
      <div
        className={`countdown-digit font-mono text-2xl sm:text-4xl md:text-6xl font-light tracking-wider ${
          isSeconds ? 'text-[#c41e3a]' : 'text-[#e8e8e8]'
        } ${isFlipping ? 'digit-flip' : ''}`}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="font-mono text-[10px] md:text-xs tracking-[0.3em] text-[#8a8a95] mt-2">
        {label}
      </div>
    </div>
  );
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);

  const computeTimeLeft = useCallback(() => {
    const now = new Date();
    const diff = TARGET_DATE.getTime() - now.getTime();
    if (diff <= 0) return null;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      mins: Math.floor((diff / (1000 * 60)) % 60),
      secs: Math.floor((diff / 1000) % 60),
    };
  }, []);

  useEffect(() => {
    const initTimeout = setTimeout(() => setTimeLeft(computeTimeLeft()), 0);
    const timer = setInterval(() => {
      const tl = computeTimeLeft();
      if (!tl) {
        clearInterval(timer);
        return;
      }
      setTimeLeft(tl);
    }, 1000);
    return () => {
      clearTimeout(initTimeout);
      clearInterval(timer);
    };
  }, [computeTimeLeft]);

  if (!timeLeft) {
    return null;
  }

  const blocks = [
    { value: timeLeft.days, label: 'DAYS' },
    { value: timeLeft.hours, label: 'HOURS' },
    { value: timeLeft.mins, label: 'MINS' },
    { value: timeLeft.secs, label: 'SECS', isSeconds: true },
  ];

  return (
    <div className="flex items-center justify-center gap-4 md:gap-8">
      {blocks.map((block) => (
        <CountdownBlock
          key={block.label}
          value={block.value}
          label={block.label}
          isSeconds={block.isSeconds}
        />
      ))}
    </div>
  );
}

const subtitleWords = ['THE', 'TWILIGHT', 'OF', 'AI'];

function AnimatedSubtitle() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <p className="font-mono text-sm md:text-base tracking-[0.4em] text-[#8a8a95]">
        THE TWILIGHT OF AI
      </p>
    );
  }

  return (
    <p className="font-mono text-sm md:text-base tracking-[0.4em] text-[#8a8a95]">
      {subtitleWords.map((word, index) => (
        <motion.span
          key={index}
          className="inline-block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.5 + index * 0.08,
            ease: 'easeOut',
          }}
        >
          {word}
          {index < subtitleWords.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </p>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Subtle parallax on the temple background
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden"
    >
      {/* Particle Field Background */}
      <div className="absolute inset-0 z-[1]">
        <ParticleField />
      </div>

      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0 z-0"
        style={reducedMotion ? {} : { y: backgroundY, scale: backgroundScale }}
      >
        <Image
          src="/images/temple.png"
          alt="Valhalla Temple"
          fill
          priority
          className="object-cover object-center"
          style={{ filter: 'brightness(0.4)' }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]" />
        {/* Scan lines effect */}
        <div className="absolute inset-0 landing-scanlines opacity-[0.03]" />
      </motion.div>

      {/* Yggdrasil Tree - Centered behind content */}
      <motion.div
        className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 0.15, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
      >
        <div className="relative w-[600px] h-[600px] md:w-[800px] md:h-[800px]">
          <Image
            src="/images/yggdrasil.png"
            alt="Yggdrasil - The World Tree"
            fill
            className="object-contain"
            style={{ filter: 'brightness(0.8) contrast(1.1)' }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Main Title with Glitch Effect */}
        <motion.h1
          className="font-mono text-6xl md:text-8xl lg:text-[140px] font-light tracking-[0.15em] text-[#e8e8e8] mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <GlitchText text="RAGNARÖK" />
        </motion.h1>

        {/* Subtitles with staggered word reveal */}
        <motion.div
          className="space-y-3 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <AnimatedSubtitle />
          <motion.p
            className="font-mono text-sm md:text-base tracking-[0.4em] text-[#8a8a95]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            PROVE INTELLECT. OR FALL.
          </motion.p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Link
            href="/arena"
            className="group px-10 py-4 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-sm tracking-[0.3em] transition-all duration-300 hover:bg-[#e8e8e8] hover:text-[#0a0a0f]"
          >
            ENTER ARENA
          </Link>
          <Link
            href="/docs"
            className="px-10 py-4 border border-[#333340] text-[#8a8a95] font-mono text-sm tracking-[0.3em] transition-all duration-300 hover:border-[#8a8a95] hover:text-[#e8e8e8]"
          >
            WHITEPAPER
          </Link>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <Countdown />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={reducedMotion ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown className="w-6 h-6 text-[#8a8a95]" />
      </motion.div>
    </section>
  );
}
