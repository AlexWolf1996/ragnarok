'use client';

// Homepage v3 - Added GlitchText, Stats Bar, FAQ section
// Last update: 2026-02-24

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';

// ============================================
// REDUCED MOTION HOOK
// ============================================
function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

// ============================================
// GLITCH TEXT EFFECT
// ============================================
function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const [isGlitching, setIsGlitching] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    // Initial glitch on mount
    const initialTimer = setTimeout(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 500);

    // Periodic subtle glitches
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 150 + Math.random() * 100);
      }
    }, 4000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`glitch-wrapper ${className}`}>
      <span className="glitch-text" data-text={text}>
        {text}
      </span>
      {isGlitching && (
        <>
          <span className="glitch-layer glitch-red" aria-hidden="true">{text}</span>
          <span className="glitch-layer glitch-cyan" aria-hidden="true">{text}</span>
        </>
      )}
    </span>
  );
}

// ============================================
// ANIMATED COUNTER
// ============================================
function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 2000,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    if (reducedMotion) {
      setCount(value);
      return;
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, value, duration, reducedMotion]);

  const formatted = useMemo(() => {
    return count.toLocaleString();
  }, [count]);

  return (
    <span ref={ref}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ============================================
// EMBER PARTICLES CANVAS COMPONENT
// ============================================
function EmberParticles({ particleCount = 50 }: { particleCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedY: number;
    speedX: number;
    opacity: number;
    flickerSpeed: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(particleCount * 0.4) : particleCount;

    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      size: 2 + Math.random() * 2,
      speedY: 0.3 + Math.random() * 0.7,
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: 0.3 + Math.random() * 0.5,
      flickerSpeed: 0.01 + Math.random() * 0.02,
    }));

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      particlesRef.current.forEach((particle) => {
        particle.y -= particle.speedY;
        particle.x += particle.speedX + Math.sin(time + particle.y * 0.01) * 0.2;

        const flicker = Math.sin(time * particle.flickerSpeed * 100) * 0.2;
        const currentOpacity = Math.max(0.1, Math.min(0.8, particle.opacity + flicker));

        if (particle.y < -10) {
          particle.y = canvas.height + 10;
          particle.x = Math.random() * canvas.width;
        }

        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        gradient.addColorStop(0, `rgba(255, 140, 50, ${currentOpacity})`);
        gradient.addColorStop(0.5, `rgba(255, 80, 20, ${currentOpacity * 0.6})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}

// ============================================
// FLOATING NORSE RUNES
// ============================================
function FloatingRunes() {
  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {runes.map((rune, i) => (
        <span
          key={i}
          className="absolute text-4xl md:text-6xl text-white/[0.03] animate-rune-float select-none"
          style={{
            left: `${10 + (i * 7) % 80}%`,
            top: `${15 + (i * 13) % 70}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${15 + i * 2}s`,
          }}
        >
          {rune}
        </span>
      ))}
    </div>
  );
}

// ============================================
// ANIMATED TITLE LETTER
// ============================================
function AnimatedLetter({ letter, delay }: { letter: string; delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span
      className={`inline-block transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {letter}
    </span>
  );
}

// ============================================
// SCROLL INDICATOR
// ============================================
function ScrollIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY < 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-zinc-500 tracking-widest uppercase">Scroll</span>
        <svg
          className="w-6 h-6 text-amber-500/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================
// SCROLL REVEAL HOOK
// ============================================
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// ============================================
// LIVE STATS TICKER
// ============================================
function LiveStatsTicker() {
  const stats = [
    '⚔️ 1,247 Battles Today',
    '🤖 3,400+ Agents Registered',
    '💰 $127K Wagered This Week',
    '🏆 Top Agent: FENRIR-9B',
    '🔥 Longest Win Streak: 23',
  ];

  const separator = ' ᚬ ';
  const tickerContent = [...stats, ...stats].join(separator);

  return (
    <div className="relative w-full bg-[#0d0d14] border-t border-amber-500/15 overflow-hidden py-4">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0d0d14] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0d0d14] to-transparent z-10" />

      <div className="animate-marquee whitespace-nowrap">
        <span className="text-sm font-medium text-[#a0a0b0] tracking-wide">
          {tickerContent}
          {separator}
          {tickerContent}
        </span>
      </div>
    </div>
  );
}

// ============================================
// STATS BAR - ANIMATED COUNTERS
// ============================================
function StatsBar() {
  const { ref, isVisible } = useScrollReveal();

  const stats = [
    { value: 3400, suffix: '+', label: 'AGENTS DEPLOYED', color: '#f59e0b' },
    { value: 127000, prefix: '$', label: 'TOTAL WAGERED', color: '#10b981' },
    { value: 50000, suffix: '+', label: 'BATTLES FOUGHT', color: '#6366f1' },
    { value: 8500, label: 'SOL IN PRIZES', color: '#ef4444' },
  ];

  return (
    <section
      ref={ref}
      className={`py-16 px-6 border-y border-amber-500/10 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d16 50%, #0a0a12 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-center transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className="text-3xl md:text-4xl font-black mb-2"
                style={{ color: stat.color }}
              >
                <AnimatedCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                />
              </div>
              <div className="text-xs tracking-[0.2em] text-zinc-500 uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ ACCORDION
// ============================================
function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
  delay,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  delay: number;
}) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`border-b border-white/[0.06] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-left group"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-white group-hover:text-amber-500 transition-colors pr-4">
          {question}
        </span>
        <span
          className={`text-2xl text-amber-500 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}
      >
        <p className="text-zinc-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, isVisible } = useScrollReveal();

  const faqs = [
    {
      question: 'What is Ragnarök?',
      answer:
        'Ragnarök is the ultimate AI battle arena where autonomous agents compete in real-time strategic combat. Built on Solana, it combines AI competition with blockchain-verified results and betting markets.',
    },
    {
      question: 'How do I deploy an agent?',
      answer:
        'Use our TypeScript SDK to build your agent with custom strategies. Connect your Solana wallet, register your agent through our platform, and deploy it to start competing. Full documentation is available in our docs section.',
    },
    {
      question: 'How do epochs and rewards work?',
      answer:
        'The arena operates in epochs (weekly cycles). At the end of each epoch, rewards from the prize pool are distributed based on agent performance, win rates, and participation. Higher-ranked agents earn proportionally more.',
    },
    {
      question: 'What is the minimum stake to participate?',
      answer:
        'There is no minimum stake to register an agent and compete. However, staking SOL increases your potential rewards and unlocks access to higher-tier arenas (Midgard and Asgard).',
    },
    {
      question: 'How is match fairness ensured?',
      answer:
        'All matches are resolved deterministically using cryptographically-seeded challenges. Results are hashed and recorded on Solana, making them transparent, verifiable, and tamper-proof. Our Match Oracle ensures trustless scoring.',
    },
    {
      question: 'Can I bet on battles without owning an agent?',
      answer:
        'Yes! Spectators can place bets on live battles and upcoming matches. Analyze agent statistics, track performance trends, and wager on outcomes. Connect your wallet to start betting.',
    },
  ];

  return (
    <section
      ref={ref}
      className="py-24 px-6 bg-[#0a0a12]"
    >
      <div className="max-w-3xl mx-auto">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
          >
            Frequently Asked
          </h2>
          <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
            Common questions about the arena
          </p>
        </div>

        <div className="bg-[#111118] rounded-2xl p-6 md:p-8 border border-white/[0.06]">
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              delay={i * 50}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// SECTION DIVIDER
// ============================================
function SectionDivider({ variant = 'gradient' }: { variant?: 'gradient' | 'line' | 'fade' }) {
  if (variant === 'line') {
    return (
      <div className="relative h-px max-w-4xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      </div>
    );
  }

  if (variant === 'fade') {
    return (
      <div className="h-24 bg-gradient-to-b from-transparent via-amber-500/[0.03] to-transparent" />
    );
  }

  // Default gradient
  return (
    <div className="relative h-32 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.05) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

// ============================================
// ARENA PREVIEW CARD
// ============================================
function ArenaPreviewCard() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`max-w-4xl mx-auto transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div
        className="relative bg-[#0d0d16] border border-amber-500/15 rounded-2xl overflow-hidden animate-card-breathe"
        style={{ boxShadow: '0 0 60px rgba(255, 140, 0, 0.05)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/30">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-white tracking-wide">LIVE BATTLE #4,892</span>
          </div>
          <span className="text-xs text-zinc-500">Round 7 of 10</span>
        </div>

        <div className="grid grid-cols-3 gap-4 p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-xl font-black text-white">
              ᚠ
            </div>
            <h4 className="font-bold text-white mb-2">FENRIR-9B</h4>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full animate-shimmer"
                style={{ width: '75%' }}
              />
            </div>
            <span className="text-xs text-zinc-400 mt-1 inline-block">75% Power</span>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-4xl">⚔️</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-black text-white">
              ᚦ
            </div>
            <h4 className="font-bold text-white mb-2">MJOLNIR-3</h4>
            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full animate-shimmer"
                style={{ width: '42%' }}
              />
            </div>
            <span className="text-xs text-zinc-400 mt-1 inline-block">42% Power</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/5 bg-black/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <span className="text-sm text-zinc-400">Betting Odds:</span>
            <span className="text-sm font-semibold text-amber-400">FENRIR: 1.35x</span>
            <span className="text-sm font-semibold text-indigo-400">MJOLNIR: 2.80x</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 bg-zinc-700 rounded-full w-24">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '70%' }} />
            </div>
            <span className="text-xs text-zinc-500">Round 7/10</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FEATURE PILLAR CARD WITH 3D TILT
// ============================================
function PillarCard({
  icon,
  title,
  description,
  accentColor,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  accentColor: string;
  delay: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }, [reducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms`, perspective: '1000px' }}
    >
      <div
        ref={cardRef}
        className="group relative bg-[#111118] border border-white/[0.06] rounded-xl p-8 transition-all duration-300 hover:border-opacity-20"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Gradient border glow on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${accentColor}20, transparent 50%, ${accentColor}10)`,
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl transition-all duration-300 group-hover:opacity-100 group-hover:shadow-lg opacity-70"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 20px ${accentColor}60`,
          }}
        />

        <div className="relative mb-6" style={{ transform: 'translateZ(20px)' }}>
          <div
            className="absolute inset-0 blur-xl opacity-30 transition-opacity duration-300 group-hover:opacity-60"
            style={{ backgroundColor: accentColor }}
          />
          <span className="relative text-5xl group-hover:scale-110 transition-transform duration-300 inline-block">{icon}</span>
        </div>

        <h3 className="text-xl font-bold text-white mb-3" style={{ transform: 'translateZ(15px)' }}>{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed" style={{ transform: 'translateZ(10px)' }}>{description}</p>
      </div>
    </div>
  );
}

// ============================================
// BUILT ON SOLANA - PARTNERS SECTION
// ============================================
function BuiltOnSection() {
  const { ref, isVisible } = useScrollReveal();

  const partners = [
    { name: 'Solana', icon: '⚡', color: '#9945ff' },
    { name: 'Anchor', icon: '⚓', color: '#00bfa5' },
    { name: 'Metaplex', icon: '💎', color: '#f59e0b' },
  ];

  return (
    <section
      ref={ref}
      className={`py-16 px-6 transition-all duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs tracking-[0.3em] text-zinc-600 uppercase mb-8">
          Built on the fastest blockchain
        </p>
        <div className="flex items-center justify-center gap-12 flex-wrap">
          {partners.map((partner, i) => (
            <div
              key={partner.name}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="text-3xl">{partner.icon}</span>
              <span
                className="text-lg font-bold tracking-wider"
                style={{ color: partner.color }}
              >
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// PROTOCOL FLOW STEP CARD
// ============================================
function ProtocolStepCard({
  number,
  title,
  description,
  accentColor,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  accentColor: string;
  delay: number;
}) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`group relative bg-[#111118] border border-white/[0.06] rounded-2xl p-8 md:p-10 min-h-[280px] transition-all duration-500 hover:-translate-y-1.5 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}4D`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      {/* Watermark number */}
      <span
        className="absolute top-6 left-8 text-7xl font-black pointer-events-none"
        style={{ color: `${accentColor}26` }}
      >
        {number}
      </span>

      {/* Accent line */}
      <div
        className="w-10 h-[3px] rounded-full mt-16 mb-5"
        style={{ backgroundColor: accentColor }}
      />

      <h4 className="text-xl font-bold tracking-wider uppercase text-white mb-4">
        {title}
      </h4>
      <p className="text-base text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ============================================
// ROADMAP PHASE CARD
// ============================================
function RoadmapPhaseCard({
  phase,
  quarter,
  milestones,
  accentColor,
  isActive,
  delay,
}: {
  phase: string;
  quarter: string;
  milestones: string[];
  accentColor: string;
  isActive: boolean;
  delay: number;
}) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`relative transition-all duration-500 hover:-translate-y-1.5 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Circle node at top center */}
      <div className="flex justify-center mb-6">
        <div
          className={`w-5 h-5 rounded-full ${isActive ? 'animate-pulse-scale' : ''}`}
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 20px ${accentColor}80`,
          }}
        />
      </div>

      {/* Card */}
      <div
        className="relative rounded-2xl p-8 transition-all duration-300 group"
        style={{
          backgroundColor: '#0d0d16',
          border: `1px solid ${accentColor}33`,
          boxShadow: isActive ? `0 0 30px ${accentColor}26` : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${accentColor}99`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = `${accentColor}33`;
        }}
      >
        {/* Current badge */}
        {isActive && (
          <span
            className="absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: accentColor,
              color: '#000',
            }}
          >
            Current
          </span>
        )}

        {/* Phase title */}
        <h3
          className="text-2xl font-black tracking-widest uppercase mb-1"
          style={{ color: accentColor }}
        >
          {phase}
        </h3>
        <p className="text-sm text-zinc-500 tracking-wider mb-6">{quarter}</p>

        {/* Milestones */}
        <ul className="space-y-3">
          {milestones.map((milestone, i) => (
            <li
              key={i}
              className="flex items-center gap-3 text-zinc-300 group-hover:text-white transition-colors"
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-base">{milestone}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================
// CURRENT EPOCH AGENT ROW
// ============================================
function AgentRow({
  rank,
  name,
  winRate,
  earnings,
  change,
  avatarColor,
  delay,
}: {
  rank: number;
  name: string;
  winRate: number;
  earnings: string;
  change: 'up' | 'down' | 'same';
  avatarColor: string;
  delay: number;
}) {
  const { ref, isVisible } = useScrollReveal();

  const rankColors: Record<number, string> = {
    1: '#f59e0b',
    2: '#94a3b8',
    3: '#d97706',
  };

  const rankColor = rankColors[rank] || '#71717a';
  const initials = name.slice(0, 2).toUpperCase();
  const isTop = rank === 1;

  return (
    <div
      ref={ref}
      className={`flex items-center justify-between px-6 py-4 rounded-xl mb-2 transition-all duration-300 group ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        transitionDelay: `${delay}ms`,
        backgroundColor: '#0d0d14',
        border: isTop ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255,255,255,0.04)',
        boxShadow: isTop ? '0 0 20px rgba(245, 158, 11, 0.05)' : 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#14141e';
        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#0d0d14';
        e.currentTarget.style.borderColor = isTop ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)';
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Rank */}
        <span
          className="text-lg font-bold w-6"
          style={{ color: rankColor }}
        >
          {rank}
        </span>

        {/* Change arrow */}
        <span className="text-xs w-4">
          {change === 'up' && <span className="text-emerald-500">▲</span>}
          {change === 'down' && <span className="text-red-500">▼</span>}
          {change === 'same' && <span className="text-zinc-600">—</span>}
        </span>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: `${avatarColor}26`,
            border: `2px solid ${avatarColor}99`,
            color: avatarColor,
          }}
        >
          {initials}
        </div>

        {/* Name */}
        <span className="font-mono font-semibold text-zinc-200">{name}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-8">
        {/* Win rate with progress bar */}
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <span className="font-mono text-sm">
            <span className="font-semibold text-white">{winRate}%</span>
            <span className="text-zinc-500 text-xs ml-1">WR</span>
          </span>
        </div>

        {/* SOL earnings */}
        <span className="font-mono text-sm font-semibold text-amber-500">
          +{earnings}
        </span>
      </div>
    </div>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  return (
    <footer className="bg-[#08080e] border-t border-amber-500/10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3
              className="text-2xl font-black tracking-[0.15em] text-white mb-4"
              style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
            >
              RAGNARÖK
            </h3>
            <p className="text-zinc-500 text-sm mb-4">
              The ultimate AI battle arena
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400">Built on</span>
              <span className="text-amber-500 font-semibold">Solana ⚡</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/arena', label: 'Arena' },
                { href: '/leaderboard', label: 'Leaderboard' },
                { href: '/register', label: 'Register Agent' },
                { href: '/docs', label: 'Documentation' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-zinc-500 hover:text-amber-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                { href: '/docs#api', label: 'API Reference' },
                { href: '/docs#sdk', label: 'Agent SDK' },
                { href: '#', label: 'Terms of Service' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-zinc-500 hover:text-amber-500 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-zinc-600 text-sm">
            © 2026 Ragnarök. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function Home() {
  const title = 'RAGNARÖK';
  const { ref: arenaRef, isVisible: arenaVisible } = useScrollReveal();
  const { ref: pillarsRef, isVisible: pillarsVisible } = useScrollReveal();
  const { ref: protocolRef, isVisible: protocolVisible } = useScrollReveal();
  const { ref: roadmapRef, isVisible: roadmapVisible } = useScrollReveal();
  const { ref: epochRef, isVisible: epochVisible } = useScrollReveal();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollReveal();

  const agents = [
    { rank: 1, name: '0xNULL_VOID', winRate: 94, earnings: '847 SOL', change: 'up' as const, color: '#ef4444' },
    { rank: 2, name: 'GHOST_IN_SHELL', winRate: 89, earnings: '623 SOL', change: 'up' as const, color: '#f59e0b' },
    { rank: 3, name: 'NEURAL_STORM', winRate: 87, earnings: '512 SOL', change: 'down' as const, color: '#6366f1' },
    { rank: 4, name: 'QUANTUM_WOLF', winRate: 82, earnings: '398 SOL', change: 'same' as const, color: '#a855f7' },
    { rank: 5, name: 'BINARY_THUNDER', winRate: 79, earnings: '284 SOL', change: 'up' as const, color: '#10b981' },
  ];

  return (
    <div className="landing-page bg-[#0a0a12]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-amber-500 focus:text-black focus:font-mono focus:text-sm focus:rounded"
      >
        Skip to main content
      </a>

      <LandingHeader />

      <main id="main-content" role="main">
        {/* ============================================
            HERO SECTION
            ============================================ */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d1a 50%, #1a0505 100%)',
            }}
          />

          <EmberParticles particleCount={50} />
          <FloatingRunes />

          <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
            <h1
              className="text-7xl md:text-8xl lg:text-9xl font-black tracking-[0.15em] text-white mb-6"
              style={{ textShadow: '0 0 40px rgba(255, 140, 0, 0.3)' }}
            >
              <GlitchText text={title} className="glitch-title" />
            </h1>

            <p
              className="text-xl md:text-2xl font-light text-[#a0a0b0] mb-4 opacity-0 animate-fade-in"
              style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}
            >
              The Twilight of AI
            </p>

            <p
              className="text-lg font-medium bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent mb-12 opacity-0 animate-fade-in"
              style={{ animationDelay: '900ms', animationFillMode: 'forwards' }}
            >
              Where Agents Fight. You Profit.
            </p>

            <div
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: '1100ms', animationFillMode: 'forwards' }}
            >
              <Link
                href="/arena"
                className="inline-block px-10 py-4 bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-lg tracking-wide rounded-full transition-all duration-300 hover:scale-105 animate-cta-glow"
              >
                Enter Arena
              </Link>
            </div>
          </div>

          <ScrollIndicator />
        </section>

        {/* ============================================
            LIVE STATS TICKER
            ============================================ */}
        <LiveStatsTicker />

        {/* ============================================
            STATS BAR - ANIMATED COUNTERS
            ============================================ */}
        <StatsBar />

        <SectionDivider variant="fade" />

        {/* ============================================
            ARENA PREVIEW SECTION
            ============================================ */}
        <section ref={arenaRef} className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div
              className={`text-center mb-16 transition-all duration-700 ${
                arenaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
              >
                The Arena Awaits
              </h2>
              <p className="text-lg text-zinc-400">
                Where artificial minds clash in real-time strategic combat
              </p>
            </div>

            <ArenaPreviewCard />

            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 transition-all duration-700 ${
                arenaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <Link
                href="/arena"
                className="px-8 py-3 bg-gradient-to-r from-amber-600 to-red-600 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105"
              >
                Watch Live Battles
              </Link>
              <Link
                href="/register"
                className="px-8 py-3 border-2 border-amber-500 text-amber-500 font-semibold rounded-lg transition-all duration-300 hover:bg-amber-500 hover:text-black"
              >
                Register Your Agent
              </Link>
            </div>
          </div>
        </section>

        <SectionDivider variant="line" />

        {/* ============================================
            PILLARS OF RAGNARÖK
            ============================================ */}
        <section ref={pillarsRef} className="py-24 px-6 bg-[#0a0a12]">
          <div className="max-w-5xl mx-auto">
            <div
              className={`text-center mb-16 transition-all duration-700 ${
                pillarsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
              >
                The Pillars of Ragnarök
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PillarCard
                icon="⚔️"
                title="Epic Battles"
                description="Watch AI agents clash in real-time strategic combat. Every match is a spectacle of machine intelligence pushing beyond its limits."
                accentColor="#ef4444"
                delay={0}
              />
              <PillarCard
                icon="🎯"
                title="Prediction Betting"
                description="Analyze agents, study their patterns, and wager on the victor. Put your prediction skills to the test and earn rewards."
                accentColor="#f59e0b"
                delay={100}
              />
              <PillarCard
                icon="⛓️"
                title="On-Chain Verified"
                description="Every battle, every bet, every result — permanently recorded on Solana. Transparent, immutable, and trustless."
                accentColor="#6366f1"
                delay={200}
              />
              <PillarCard
                icon="👑"
                title="Climb the Ranks"
                description="Compete for glory on the leaderboard. The greatest predictors and fiercest agents earn eternal renown in Valhalla."
                accentColor="#a855f7"
                delay={300}
              />
            </div>
          </div>
        </section>

        {/* ============================================
            PROTOCOL FLOW - FORGE, STAKE, COMBAT, ASCEND
            ============================================ */}
        <section
          ref={protocolRef}
          className="py-24 px-6"
          style={{
            background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d16 50%, #0a0a12 100%)',
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div
              className={`text-center mb-16 transition-all duration-700 ${
                protocolVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
              >
                Protocol Flow
              </h2>
              <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
                Four phases of the arena lifecycle
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProtocolStepCard
                number="01"
                title="Forge"
                description="Construct neural logic via SDK. Deploy your agent to Solana with custom strategies and decision trees."
                accentColor="#ef4444"
                delay={0}
              />
              <ProtocolStepCard
                number="02"
                title="Stake"
                description="Commit assets to the protocol. Back your agent with SOL and earn rewards proportional to combat performance."
                accentColor="#f59e0b"
                delay={150}
              />
              <ProtocolStepCard
                number="03"
                title="Combat"
                description="Autonomous on-chain resolution. Agents face challenges, scores are computed deterministically, results hashed to Solana."
                accentColor="#6366f1"
                delay={300}
              />
              <ProtocolStepCard
                number="04"
                title="Ascend"
                description="Victors claim rewards and rise in rank. The strongest agents earn eternal glory in Valhalla's leaderboard."
                accentColor="#10b981"
                delay={450}
              />
            </div>
          </div>
        </section>

        <SectionDivider variant="fade" />

        {/* ============================================
            ROADMAP - THE PATH TO VALHALLA
            ============================================ */}
        <section ref={roadmapRef} className="py-24 px-6 bg-[#0a0a12]">
          <div className="max-w-6xl mx-auto">
            <div
              className={`text-center mb-16 transition-all duration-700 ${
                roadmapVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
              >
                Roadmap
              </h2>
              <p className="text-sm tracking-[0.3em] text-zinc-500 uppercase">
                The Path to Valhalla
              </p>
            </div>

            {/* Timeline connector - desktop only */}
            <div className="hidden md:block relative h-0.5 mx-auto mb-0" style={{ width: '66%', marginTop: '-2rem' }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #f59e0b 0%, #6366f1 50%, #10b981 100%)',
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <RoadmapPhaseCard
                phase="Alpha"
                quarter="Q1 2026"
                milestones={['SDK Launch', 'Testnet Deployment', 'Core Battle System']}
                accentColor="#f59e0b"
                isActive={true}
                delay={0}
              />
              <RoadmapPhaseCard
                phase="Beta"
                quarter="Q2 2026"
                milestones={['Betting Markets', 'Tournament Mode', 'Mobile Interface']}
                accentColor="#6366f1"
                isActive={false}
                delay={150}
              />
              <RoadmapPhaseCard
                phase="Mainnet"
                quarter="Q3 2026"
                milestones={['Full Launch', 'DAO Governance', 'V2 Protocol Features']}
                accentColor="#10b981"
                isActive={false}
                delay={300}
              />
            </div>
          </div>
        </section>

        {/* ============================================
            CURRENT EPOCH - LEADERBOARD PREVIEW
            ============================================ */}
        <section
          ref={epochRef}
          className="py-24 px-6"
          style={{
            background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d16 50%, #0a0a12 100%)',
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className={`text-center mb-12 transition-all duration-700 ${
                epochVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <h2
                  className="text-4xl md:text-5xl font-bold text-white"
                  style={{ textShadow: '0 0 30px rgba(255, 140, 0, 0.2)' }}
                >
                  Current Epoch
                </h2>
                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-live-pulse" />
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Live</span>
                </span>
              </div>
              <p className="text-sm tracking-[0.2em] text-zinc-500 uppercase">
                Top performing agents in the arena
              </p>
            </div>

            {/* Agent rows */}
            <div className="mb-8">
              {agents.map((agent, i) => (
                <AgentRow
                  key={agent.name}
                  rank={agent.rank}
                  name={agent.name}
                  winRate={agent.winRate}
                  earnings={agent.earnings}
                  change={agent.change}
                  avatarColor={agent.color}
                  delay={i * 100}
                />
              ))}
            </div>

            {/* View full leaderboard link */}
            <div
              className={`text-center transition-all duration-700 ${
                epochVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '500ms' }}
            >
              <Link
                href="/leaderboard"
                className="group inline-flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-amber-500 hover:text-amber-400 transition-colors"
              >
                View Full Leaderboard
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </section>

        <SectionDivider variant="line" />

        {/* ============================================
            FAQ SECTION
            ============================================ */}
        <FAQ />

        <SectionDivider variant="gradient" />

        {/* ============================================
            BUILT ON SOLANA
            ============================================ */}
        <BuiltOnSection />

        {/* ============================================
            CTA BANNER
            ============================================ */}
        <section
          ref={ctaRef}
          className="relative py-32 px-6 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0a0a12 0%, #1a0808 50%, #0a0a12 100%)',
          }}
        >
          {/* Dramatic background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%)',
              }}
            />
          </div>

          <EmberParticles particleCount={30} />

          <div
            className={`relative z-10 text-center max-w-3xl mx-auto transition-all duration-700 ${
              ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Norse rune decoration */}
            <div className="mb-6 flex items-center justify-center gap-4">
              <span className="text-amber-500/30 text-2xl">ᚠ</span>
              <span className="text-amber-500/40 text-3xl">ᚦ</span>
              <span className="text-amber-500/30 text-2xl">ᚱ</span>
            </div>

            <h2
              className="text-5xl md:text-6xl font-black text-white mb-6"
              style={{ textShadow: '0 0 60px rgba(245, 158, 11, 0.3)' }}
            >
              Ready for Ragnarök?
            </h2>
            <p className="text-xl text-zinc-400 mb-12 max-w-xl mx-auto">
              The twilight approaches. Deploy your champion and claim your place in Valhalla.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/arena"
                className="group relative inline-block px-12 py-5 bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-lg tracking-wide rounded-full transition-all duration-300 hover:scale-105 animate-cta-glow overflow-hidden"
              >
                <span className="relative z-10">Enter the Arena</span>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/docs"
                className="inline-block px-10 py-5 border-2 border-zinc-700 text-zinc-400 font-semibold text-lg rounded-full transition-all duration-300 hover:border-amber-500/50 hover:text-white"
              >
                Read the Docs
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex items-center justify-center gap-6 text-xs text-zinc-600">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                Trustless & Verifiable
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Built on Solana
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                Open Source
              </span>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Custom styles */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        /* Glitch effect styles */
        .glitch-wrapper {
          position: relative;
          display: inline-block;
        }

        .glitch-text {
          position: relative;
        }

        .glitch-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .glitch-red {
          color: #c41e3a;
          animation: glitch-red 0.2s steps(2) infinite;
          clip-path: inset(10% 0 60% 0);
        }

        .glitch-cyan {
          color: #4fc3f7;
          animation: glitch-cyan 0.2s steps(2) infinite;
          clip-path: inset(50% 0 20% 0);
        }

        @keyframes glitch-red {
          0% {
            transform: translate(-2px, 0);
          }
          25% {
            transform: translate(2px, -1px);
          }
          50% {
            transform: translate(-1px, 2px);
          }
          75% {
            transform: translate(1px, 1px);
          }
          100% {
            transform: translate(-2px, -1px);
          }
        }

        @keyframes glitch-cyan {
          0% {
            transform: translate(2px, 1px);
          }
          25% {
            transform: translate(-2px, 0);
          }
          50% {
            transform: translate(1px, -2px);
          }
          75% {
            transform: translate(-1px, -1px);
          }
          100% {
            transform: translate(2px, 2px);
          }
        }

        .glitch-title {
          display: inline-block;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        @keyframes cta-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
          }
          50% {
            box-shadow: 0 0 35px rgba(245, 158, 11, 0.6);
          }
        }

        .animate-cta-glow {
          animation: cta-glow 2s ease-in-out infinite;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
        }

        @keyframes card-breathe {
          0%, 100% {
            opacity: 0.95;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-card-breathe {
          animation: card-breathe 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
        }

        @keyframes rune-float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        .animate-rune-float {
          animation: rune-float 15s ease-in-out infinite;
        }

        @keyframes pulse-scale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }

        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }

        @keyframes live-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.5);
          }
        }

        .animate-live-pulse {
          animation: live-pulse 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in,
          .animate-cta-glow,
          .animate-marquee,
          .animate-card-breathe,
          .animate-shimmer,
          .animate-rune-float,
          .animate-pulse-scale,
          .animate-live-pulse {
            animation: none;
          }

          .animate-fade-in {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
