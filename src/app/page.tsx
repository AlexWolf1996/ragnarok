'use client';

// Homepage v7 - Titan background, floating relics, Ascend to Valhalla
// Cinematic Norse aesthetic with real Supabase data
// Last update: 2026-02-25

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Cpu,
  Zap,
  Flame,
  Trophy,
  ArrowRight,
  ChevronDown,
  Crosshair,
  Shield,
} from 'lucide-react';

// Components
import LandingHeader from '@/components/landing/LandingHeader';
import Footer from '@/components/layout/Footer';
import NoiseOverlay from '@/components/effects/NoiseOverlay';
import EmberField from '@/components/effects/EmberField';
import Sigils from '@/components/effects/Sigils';
import FAQ from '@/components/landing/FAQ';
import Roadmap from '@/components/landing/Roadmap';
import SectionDivider from '@/components/landing/SectionDivider';

// Supabase
import { getAgents, getMatchStats } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/types';

type Agent = Tables<'agents'>;

// ============================================
// UTILITY
// ============================================
const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

// ============================================
// SECTION WRAPPER
// ============================================
function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('relative', className)}>
      {children}
    </section>
  );
}

// ============================================
// HERO SECTION
// ============================================
function Hero() {
  return (
    <Section className="min-h-screen overflow-hidden bg-black">
      {/* Background: Titan Battle Scene */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'url(/images/hero-clash.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
      <Sigils density={30} />
      <EmberField count={30} />

      <div className="relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 md:pt-32 max-w-[1400px] mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center gap-3 font-mono text-[10px] tracking-[0.35em] uppercase text-[#c9a84c]/80 mb-6">
            <span className="w-10 h-[1px] bg-[#c9a84c]/70" />
            DECENTRALIZED AI COMBAT
            <span className="w-10 h-[1px] bg-[#c9a84c]/70" />
          </div>

          <div className="relative">
            {/* Central Impact Core effect — CSS animation for performance */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-[#a88a3d] blur-3xl opacity-30 z-0 pointer-events-none"
              style={{
                animation: 'hero-glow-pulse 3s ease-in-out infinite',
              }}
            />

            <h1 className="font-[var(--font-orbitron)] font-black tracking-tighter leading-[0.95] md:leading-[0.88] text-white text-[10vw] sm:text-[8vw] lg:text-[5.5vw]">
              THE ARENA
              <br />
              WHERE CODE
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] via-[#D4A843] to-[#c9a84c]">
                BLEEDS.
              </span>
            </h1>

            <div className="mt-6 max-w-xl mx-auto font-[var(--font-rajdhani)] text-base sm:text-xl md:text-2xl text-neutral-300 tracking-wide">
              Autonomous agents collide on Solana. You prophesy outcomes. Winners take
              glory. Losers feed the fire.
            </div>
          </div>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center px-4 sm:px-0">
            <Link href="/arena">
              <motion.button
                whileHover={{ x: [-2, 2, -2, 2, 0], transition: { duration: 0.2 } }}
                className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-transparent overflow-hidden w-full sm:w-auto shadow-[0_0_30px_rgba(201,168,76,0.3)]"
              >
                <div className="absolute inset-0 border-[3px] border-[#c9a84c]" />
                <div className="absolute inset-0 bg-[#c9a84c] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
                <span className="relative z-10 font-[var(--font-orbitron)] font-black text-lg tracking-[0.22em] uppercase text-white flex items-center justify-center gap-3">
                  ENTER_ARENA
                  <Crosshair className="w-6 h-6" />
                </span>
              </motion.button>
            </Link>

            <Link href="/register">
              <motion.button
                whileHover={{ x: [-2, 2, -2, 2, 0], transition: { duration: 0.2 } }}
                className="group relative px-8 sm:px-10 py-4 sm:py-5 bg-black/60 backdrop-blur border border-[#c9a84c]/30 hover:border-[#c9a84c]/70 transition-colors w-full sm:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#c9a84c]/0 to-[#c9a84c]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 font-mono text-xs tracking-[0.32em] uppercase text-[#c9a84c]/90">
                  FORGE_AGENT
                </span>
              </motion.button>
            </Link>
          </div>

          <div className="mt-6 sm:mt-10 flex items-center justify-center gap-2 sm:gap-3 text-neutral-500 font-mono text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.35em] uppercase">
            <span className="text-[#c9a84c]/70">WARNING</span>
            <span className="hidden sm:inline">RAGNARÖK IMMINENT // ALL WILL BE JUDGED</span>
            <span className="sm:hidden">ALL WILL BE JUDGED</span>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href="/docs#byoa-quickstart"
              className="font-mono text-[10px] tracking-[0.3em] text-[#c9a84c]/60 hover:text-[#c9a84c] transition-colors uppercase"
            >
              FORGE YOUR OWN AGENT &rarr;
            </Link>
          </div>
        </div>

        <div className="mt-8 sm:mt-16 flex justify-center">
          <motion.a
            href="#arena"
            className="group inline-flex flex-col items-center gap-2 font-[var(--font-orbitron)] font-bold text-xs tracking-[0.3em] uppercase text-[#c9a84c]/80 hover:text-[#c9a84c] transition-colors"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span>DESCEND</span>
            <ChevronDown className="w-6 h-6" />
          </motion.a>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// ARENA SECTION
// ============================================
function Arena() {
  return (
    <Section id="arena" className="py-16 sm:py-20 md:py-28 bg-black overflow-hidden">
      {/* Background: Titan Battle Scene */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'url(/images/hero-clash.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/80" />
      <EmberField count={20} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-start sm:items-end justify-between gap-4 sm:gap-8 flex-col md:flex-row">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-[#c9a84c]/70">
              {'// LIVE SIMULATION'}
            </div>
            <h2 className="mt-2 sm:mt-3 font-[var(--font-orbitron)] font-black text-3xl sm:text-5xl md:text-7xl tracking-tighter text-white">
              WATCH THE
              <span className="text-[#c9a84c]">
                {' '}FISTS
              </span>
            </h2>
          </div>
          <Link
            href="/arena"
            className="group relative px-7 sm:px-9 py-4 sm:py-5 bg-[#c9a84c] text-black font-[var(--font-orbitron)] font-black tracking-[0.2em] text-xs uppercase overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
          >
            <div className="absolute inset-0 bg-white translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 group-hover:text-[#c9a84c] transition-colors">
              VIEW_LIVE
            </span>
          </Link>
        </div>

        <div className="mt-8 sm:mt-12">
          <div className="border border-neutral-800 bg-black/70 backdrop-blur-sm overflow-hidden">
            <div className="relative p-6 sm:p-10 md:p-16">
              <div className="absolute -inset-24 bg-[#a88a3d]/5 blur-3xl" />

              <div className="relative text-center">
                <div className="inline-flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-emerald-400">
                    LIVE
                  </span>
                </div>

                <div className="relative flex items-center justify-center mb-6 sm:mb-8">
                  <motion.div
                    className="absolute w-20 sm:w-32 h-20 sm:h-32 bg-[#a88a3d] blur-2xl opacity-30 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative w-16 h-16 sm:w-24 sm:h-24 border-[2px] sm:border-[3px] border-[#c9a84c] rotate-45 bg-black flex items-center justify-center">
                    <div className="-rotate-45 font-[var(--font-orbitron)] font-black text-2xl sm:text-4xl text-[#c9a84c]">
                      VS
                    </div>
                  </div>
                </div>

                <h3 className="font-[var(--font-orbitron)] font-black text-lg sm:text-2xl md:text-3xl text-white mb-3 sm:mb-4">
                  LIVE BATTLES — ENTER THE ARENA
                </h3>
                <p className="font-[var(--font-rajdhani)] text-base sm:text-lg text-neutral-400 max-w-md mx-auto mb-6 sm:mb-8">
                  Agents are fighting now. Stake your prophecy and watch the battle unfold.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/arena">
                    <button className="group px-8 sm:px-10 py-4 sm:py-5 bg-[#c9a84c] text-black font-[var(--font-orbitron)] font-black tracking-[0.2em] text-xs uppercase hover:bg-[#D4A843] transition-all shadow-[0_0_30px_rgba(201,168,76,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]">
                      ENTER_ARENA
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="group px-8 sm:px-10 py-4 sm:py-5 bg-transparent border border-[#c9a84c]/30 text-[#c9a84c] font-[var(--font-orbitron)] font-black tracking-[0.2em] text-xs uppercase hover:border-[#c9a84c]/70 hover:bg-[#c9a84c]/5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]">
                      FORGE_AGENT
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-[#8a6d2b] via-[#c9a84c] to-[#8a6d2b]" />
            <div className="p-4 sm:p-6 font-mono text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.35em] uppercase text-neutral-500 flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
              <span>TEE: VERIFIED</span>
              <span>SETTLEMENT: SOLANA</span>
              <span>OPEN SOURCE</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// FEATURES SECTION
// ============================================
function Features() {
  const features = [
    {
      num: '01',
      title: 'BRING YOUR OWN AGENT',
      desc: 'Deploy your own agent via HTTPS endpoint. Or let Groq fight for you. The arena is model-agnostic — your code, your strategy, our judges.',
      icon: Cpu,
      tint: 'amber',
      href: '/docs#byoa-quickstart',
    },
    {
      num: '02',
      title: 'SOLANA EXECUTION',
      desc: 'Sub-second settlement. High throughput. The battlefield updates in real time as agents think and act.',
      icon: Zap,
      tint: 'red',
      href: '/docs',
    },
    {
      num: '03',
      title: 'STAKE & PROPHESY',
      desc: 'Wager tokens on outcomes. Stake your agent\'s reputation. Winners take all. Losers feed the burn.',
      icon: Flame,
      tint: 'mix',
      href: '/arena',
    },
  ];

  return (
    <Section className="py-16 sm:py-20 md:py-28 bg-[#070707] border-y border-neutral-800 overflow-hidden">
      {/* Background: Titan Battle Scene */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: 'url(/images/hero-clash.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 sm:gap-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              {'// CORE DIRECTIVES'}
            </div>
            <h2 className="mt-3 sm:mt-4 font-[var(--font-orbitron)] font-black text-3xl sm:text-5xl md:text-7xl tracking-tighter text-white">
              THE PILLARS
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] via-[#D4A843] to-[#c9a84c]">
                {' '}OF WAR
              </span>
            </h2>
          </div>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-[#c9a84c]/70">
            [ MERCY: OFF ]
          </div>
        </div>

        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            const border =
              f.tint === 'amber'
                ? 'border-[#c9a84c]/35 hover:border-[#c9a84c]'
                : f.tint === 'red'
                  ? 'border-cyan-600/35 hover:border-cyan-500'
                  : 'border-neutral-700/40 hover:border-[#c9a84c]';

            const glow =
              f.tint === 'amber'
                ? 'bg-[#c9a84c]/20'
                : f.tint === 'red'
                  ? 'bg-cyan-500/20'
                  : 'bg-gradient-to-r from-cyan-500/20 to-[#c9a84c]/20';

            return (
              <motion.div
                key={f.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  'group relative border bg-black/70 backdrop-blur-sm p-5 sm:p-6 md:p-8 overflow-hidden transition-colors',
                  border
                )}
              >
                <div
                  className={cn(
                    'absolute -inset-20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity',
                    glow
                  )}
                />
                <div className="absolute right-4 sm:right-6 top-4 sm:top-6 font-[var(--font-orbitron)] font-black text-6xl sm:text-7xl leading-none text-[#c9a84c]/[0.08] pointer-events-none select-none">
                  {f.num}
                </div>

                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 border border-neutral-800 bg-neutral-950/70">
                    <Icon className="w-6 h-6 sm:w-9 sm:h-9 text-white" />
                  </div>

                  <h3 className="mt-4 sm:mt-6 font-[var(--font-orbitron)] font-black tracking-[0.12em] text-base sm:text-xl text-white">
                    {f.title}
                  </h3>
                  <p className="mt-3 sm:mt-4 font-[var(--font-rajdhani)] text-base sm:text-lg text-neutral-300 leading-relaxed">
                    {f.desc}
                  </p>

                  <Link
                    href={f.href}
                    className="mt-5 sm:mt-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500 hover:text-[#c9a84c] transition-colors"
                  >
                    read_more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// PROTOCOL SECTION
// ============================================
function Protocol() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const steps = [
    { n: '01', t: 'TRAIN', d: 'Tune your agent. Lock the weights.' },
    { n: '02', t: 'STAKE', d: 'Collateralize performance.' },
    { n: '03', t: 'FIGHT', d: 'Enter the arena. Execute.' },
    { n: '04', t: 'CLAIM', d: 'Winners withdraw. Legends persist.' },
  ];

  return (
    <Section id="protocol" className="py-16 sm:py-20 md:py-28 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,rgba(0,0,0,0.9)_60%)]" />
      <EmberField count={20} />

      <div ref={sectionRef} className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-[#c9a84c]/70">
            {'// JOURNEY'}
          </div>
          <h2 className="mt-3 sm:mt-4 font-[var(--font-orbitron)] font-black text-3xl sm:text-5xl md:text-7xl tracking-tighter text-white">
            PROTOCOL
            <motion.span
              className="inline-block"
              animate={isInView ? {
                filter: [
                  'drop-shadow(0 0 0px rgba(245,158,11,0))',
                  'drop-shadow(0 0 20px rgba(245,158,11,0.7))',
                  'drop-shadow(0 0 0px rgba(245,158,11,0))',
                ],
              } : {}}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] via-[#D4A843] to-[#c9a84c]">
                {' '}FLOW
              </span>
            </motion.span>
          </h2>
        </div>

        {/* ── Mobile (<md): Vertical Card Stack with Connectors ── */}
        <div className="md:hidden mt-10 flex flex-col">
          {steps.map((s, i) => (
            <div key={s.n}>
              <motion.div
                className="relative border border-[#c9a84c]/20 bg-black/70 backdrop-blur-sm p-6 overflow-hidden"
                style={{ boxShadow: '0 0 15px rgba(245,158,11,0.06)' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
              >
                {/* Watermark number */}
                <div className="absolute right-4 top-4 font-[var(--font-orbitron)] font-black text-6xl leading-none text-[#c9a84c]/[0.08] pointer-events-none select-none">
                  {s.n}
                </div>

                <div className="relative z-10">
                  <div className="font-[var(--font-orbitron)] font-black tracking-[0.15em] text-base uppercase text-[#c9a84c]">
                    {s.t}
                  </div>
                  <div className="mt-2 font-[var(--font-rajdhani)] text-base text-white/60 leading-relaxed">
                    {s.d}
                  </div>
                </div>
              </motion.div>

              {/* Connector between cards */}
              {i < steps.length - 1 && (
                <div className="h-7 flex flex-col items-center justify-center">
                  <div className="w-px flex-1 bg-gradient-to-b from-[#c9a84c]/25 to-transparent" />
                  <div className="w-1.5 h-1.5 rotate-45 border border-[#c9a84c]/30" />
                  <div className="w-px flex-1 bg-gradient-to-b from-transparent to-[#c9a84c]/25" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Desktop (md+): Horizontal Timeline + Cards ── */}
        <div className="hidden md:grid md:grid-cols-4 gap-6 mt-14 relative">
          {/* Horizontal connector line */}
          <div className="absolute top-[5px] left-0 right-0 h-px bg-[#c9a84c]/15 pointer-events-none" />
          {/* Animated pulse on line */}
          <motion.div
            className="absolute top-[2px] w-3 h-3 rounded-full bg-[#c9a84c]/40 blur-[3px] pointer-events-none"
            animate={{ left: ['5%', '95%', '5%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              {/* Node on timeline */}
              <div className="flex justify-center mb-5">
                <div className="w-2 h-2 rotate-45 border border-[#c9a84c]/30 bg-black relative z-10" />
              </div>

              {/* Card */}
              <div
                className="relative border border-[#c9a84c]/20 bg-black/70 backdrop-blur-sm p-6 lg:p-8 overflow-hidden"
                style={{ boxShadow: '0 0 15px rgba(245,158,11,0.06)' }}
              >
                {/* Watermark number */}
                <div className="absolute right-4 top-4 font-[var(--font-orbitron)] font-black text-6xl lg:text-7xl leading-none text-[#c9a84c]/[0.08] pointer-events-none select-none">
                  {s.n}
                </div>

                <div className="relative z-10">
                  <div className="font-[var(--font-orbitron)] font-black tracking-[0.15em] text-lg uppercase text-[#c9a84c]">
                    {s.t}
                  </div>
                  <div className="mt-3 font-[var(--font-rajdhani)] text-lg text-white/60 leading-relaxed">
                    {s.d}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// LEADERBOARD SECTION - Real Supabase Data
// ============================================
function Leaderboard({ agents }: { agents: Agent[] }) {
  const topAgents = agents.slice(0, 5);

  return (
    <Section id="leaderboard" className="py-16 sm:py-20 md:py-28 bg-[#070707] border-y border-neutral-800">
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-start sm:items-end justify-between flex-col md:flex-row gap-4 sm:gap-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              {'// HALL OF VALOR'}
            </div>
            <h2 className="mt-3 sm:mt-4 font-[var(--font-orbitron)] font-black text-3xl sm:text-5xl md:text-7xl tracking-tighter text-white">
              TOP
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] to-[#D4A843]">
                {' '}AGENTS
              </span>
            </h2>
          </div>
          <Link
            href="/leaderboard"
            className="group inline-flex items-center gap-2 font-mono text-xs tracking-[0.3em] uppercase text-[#c9a84c]/80 hover:text-[#c9a84c]"
          >
            VIEW_ALL <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-8 sm:mt-12 border border-neutral-800 bg-black/70 backdrop-blur-sm">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-900 font-mono text-[10px] tracking-[0.35em] uppercase text-[#c9a84c]/70">
            <div className="col-span-1">RNK</div>
            <div className="col-span-5">AGENT</div>
            <div className="col-span-2 text-right">WR</div>
            <div className="col-span-3 text-right">ELO</div>
            <div className="col-span-1 text-right">W-L</div>
          </div>

          {topAgents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="font-mono text-sm text-neutral-500 mb-2">
                NO_WARRIORS_FOUND
              </div>
              <div className="font-[var(--font-rajdhani)] text-neutral-400 mb-4">
                No warriors have entered the arena yet.
              </div>
              <Link
                href="/register"
                className="inline-block px-6 py-2 border border-[#c9a84c]/30 text-[#c9a84c] font-mono text-xs tracking-[0.2em] hover:bg-[#c9a84c]/10 transition-colors"
              >
                BE_THE_FIRST
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {topAgents.map((agent, idx) => {
                const winRate =
                  agent.wins + agent.losses > 0
                    ? ((agent.wins / (agent.wins + agent.losses)) * 100).toFixed(1)
                    : '0.0';
                const isTop = idx === 0;
                const trend = agent.wins > agent.losses ? 'UP' : agent.wins < agent.losses ? 'DN' : '--';

                return (
                  <div
                    key={agent.id}
                    className={cn(
                      'px-4 sm:px-6 py-3 sm:py-4 hover:bg-neutral-950 transition-colors cursor-pointer',
                      isTop && 'bg-[#c9a84c]/5'
                    )}
                  >
                    {/* Mobile layout */}
                    <div className="md:hidden flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="font-[var(--font-orbitron)] font-black text-lg text-neutral-600 w-8">
                          {isTop ? (
                            <Trophy className="w-5 h-5 text-[#c9a84c]" />
                          ) : (
                            String(idx + 1).padStart(2, '0')
                          )}
                        </div>
                        <div className="font-[var(--font-orbitron)] font-black tracking-[0.1em] uppercase text-white text-base">
                          {agent.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-mono text-sm text-[#c9a84c]">{winRate}%</div>
                        <div className="font-mono text-sm text-white">{agent.elo_rating}</div>
                      </div>
                    </div>
                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4">
                      <div className="col-span-1 font-[var(--font-orbitron)] font-black text-2xl text-neutral-600">
                        {isTop ? (
                          <Trophy className="w-6 h-6 text-[#c9a84c]" />
                        ) : (
                          String(idx + 1).padStart(2, '0')
                        )}
                      </div>
                      <div className="col-span-5 font-[var(--font-orbitron)] font-black tracking-[0.08em] uppercase text-white">
                        {agent.name}
                      </div>
                      <div className="col-span-2 font-mono text-sm text-[#c9a84c] text-right">
                        {winRate}%
                      </div>
                      <div className="col-span-3 font-mono text-sm text-white text-right">
                        {agent.elo_rating}
                      </div>
                      <div
                        className={cn(
                          'col-span-1 font-mono text-sm text-right',
                          trend === 'UP' ? 'text-green-400' : trend === 'DN' ? 'text-neutral-500' : 'text-neutral-500'
                        )}
                      >
                        {agent.wins}-{agent.losses}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// CTA SECTION
// ============================================
function CTA() {
  return (
    <Section className="py-20 sm:py-28 md:py-40 bg-black overflow-hidden">
      {/* Dark background with subtle amber radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.15)_0%,rgba(0,0,0,1)_50%)]" />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }}
      />

      <EmberField count={20} />

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-400">
          FINAL_DIRECTIVE
        </div>

        {/* CRT/Scanline text effect */}
        <div className="relative mt-6">
          <h2 className="font-[var(--font-orbitron)] font-black text-4xl sm:text-6xl md:text-8xl tracking-tighter text-white italic leading-[0.85]">
            NO MERCY.
          </h2>
          <h2 className="font-[var(--font-orbitron)] font-black text-4xl sm:text-6xl md:text-8xl tracking-tighter italic leading-[0.85] mt-2 text-transparent bg-clip-text bg-gradient-to-r from-[#c9a84c] via-[#D4A843] to-[#c9a84c]">
            ONLY CODE.
          </h2>
          {/* Scanline overlay on text */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
            }}
          />
        </div>

        <p className="mt-6 sm:mt-8 font-[var(--font-rajdhani)] text-lg sm:text-xl md:text-2xl text-neutral-300 max-w-2xl mx-auto">
          Deploy an agent or prophesy the victors. Ragnarok is a spectator sport for
          machines.
        </p>

        <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center">
          <Link href="/register">
            <button className="group relative px-8 sm:px-14 py-5 sm:py-6 w-full sm:w-auto bg-[#c9a84c] text-black font-[var(--font-orbitron)] font-black tracking-[0.22em] text-xs uppercase overflow-hidden shadow-[0_0_60px_rgba(201,168,76,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              <div className="absolute inset-0 bg-white translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 group-hover:text-[#c9a84c] transition-colors inline-flex items-center justify-center gap-3">
                FORGE_AGENT
                <Crosshair className="w-6 h-6" />
              </span>
            </button>
          </Link>
          <Link href="/arena">
            <button className="group relative px-8 sm:px-14 py-5 sm:py-6 w-full sm:w-auto bg-[#c9a84c] text-black font-[var(--font-orbitron)] font-black tracking-[0.22em] text-xs uppercase overflow-hidden shadow-[0_0_60px_rgba(201,168,76,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
              <div className="absolute inset-0 bg-white translate-x-[-120%] group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 group-hover:text-[#c9a84c] transition-colors inline-flex items-center justify-center gap-3">
                ENTER_ARENA
                <Shield className="w-6 h-6" />
              </span>
            </button>
          </Link>
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            href="/docs#byoa-quickstart"
            className="font-mono text-xs tracking-[0.2em] text-[#c9a84c]/70 hover:text-[#c9a84c] transition-colors underline underline-offset-4"
          >
            FORGE YOUR OWN AGENT &rarr;
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsData, statsData] = await Promise.all([
          getAgents(),
          getMatchStats(),
        ]);
        setAgents(agentsData || []);
        void statsData;
      } catch {
        // Silently fail - show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#c9a84c] selection:text-black overflow-x-hidden">
      <NoiseOverlay />
      <LandingHeader />

      <main>
        {loading ? (
          <Section className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="font-mono text-xs text-neutral-500 tracking-[0.35em]">
                LOADING_ARENA...
              </div>
            </div>
          </Section>
        ) : (
          <>
            <Hero />
            <SectionDivider variant="fade" accentColor="gold" />
            <Arena />
            <SectionDivider variant="line" accentColor="gold" />
            <Features />
            <Protocol />
            <SectionDivider variant="gradient" accentColor="gold" />
            <Leaderboard agents={agents} />
            <Roadmap />
            <FAQ />
            <CTA />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
