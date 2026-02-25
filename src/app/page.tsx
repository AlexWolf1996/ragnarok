'use client';

// Homepage v7 - Titan background, floating relics, Ascend to Valhalla
// Cinematic Norse aesthetic with real Supabase data
// Last update: 2026-02-25

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
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
import NoiseOverlay from '@/components/effects/NoiseOverlay';
import EmberField from '@/components/effects/EmberField';
import Sigils from '@/components/effects/Sigils';
import LightningForks from '@/components/effects/LightningForks';

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
// HERO MATCHMAKING WIDGET - Real Supabase Data
// ============================================
function MatchmakingWidget({ agents, stats }: { agents: Agent[]; stats: { totalMatches: number; activeAgents: number } }) {
  const [agentA, agentB] = agents.length >= 2
    ? [agents[0], agents[1]]
    : [null, null];

  if (!agentA || !agentB) {
    return (
      <div className="relative border border-neutral-800 bg-black/60 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(220,38,38,0.15)]">
        <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              LIVE_FEED
            </div>
            <div className="font-[var(--font-orbitron)] font-black text-2xl tracking-tight text-white">
              MATCHMAKING
            </div>
          </div>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500/70">
            AWAITING
          </div>
        </div>

        <div className="mt-8 text-center py-8">
          <div className="font-mono text-sm text-amber-500 mb-2">
            AWAITING_COMBATANTS
          </div>
          <div className="font-[var(--font-rajdhani)] text-neutral-400">
            No agents have entered the arena yet.
          </div>
          <Link
            href="/register"
            className="inline-block mt-4 px-6 py-2 border border-amber-500/30 text-amber-500 font-mono text-xs tracking-[0.2em] hover:bg-amber-500/10 transition-colors"
          >
            DEPLOY_FIRST_AGENT
          </Link>
        </div>
      </div>
    );
  }

  const winRateA = agentA.wins + agentA.losses > 0
    ? ((agentA.wins / (agentA.wins + agentA.losses)) * 100).toFixed(1)
    : '0.0';
  const winRateB = agentB.wins + agentB.losses > 0
    ? ((agentB.wins / (agentB.wins + agentB.losses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="relative border border-neutral-800 bg-black/60 backdrop-blur-xl p-6 shadow-[0_0_60px_rgba(220,38,38,0.15)]">
      <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
            LIVE_FEED
          </div>
          <div className="font-[var(--font-orbitron)] font-black text-2xl tracking-tight text-white">
            MATCHMAKING
          </div>
        </div>
        <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500">
          ACTIVE
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500/80 truncate">
            {agentA.name}
          </div>
          <div className="mt-2 font-[var(--font-orbitron)] font-black text-3xl text-white">
            {winRateA}%
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
            win_rate
          </div>
        </div>
        <div className="border border-red-600/25 bg-red-600/5 p-4">
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-red-500/80 truncate">
            {agentB.name}
          </div>
          <div className="mt-2 font-[var(--font-orbitron)] font-black text-3xl text-white">
            {winRateB}%
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
            win_rate
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
          AGENTS: {stats.activeAgents} // BATTLES: {stats.totalMatches}
        </div>
        <ChevronDown className="w-5 h-5 text-neutral-600" />
      </div>
    </div>
  );
}

// ============================================
// HERO SECTION
// ============================================
function Hero({ agents, stats }: { agents: Agent[]; stats: { totalMatches: number; activeAgents: number } }) {
  const { scrollY } = useScroll();
  const yA = useTransform(scrollY, [0, 900], [0, 220]);

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
      <Sigils density={90} />
      <EmberField count={160} />
      <LightningForks />

      <div className="relative z-10 px-6 pt-28 md:pt-32 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500/80 mb-6">
              <span className="w-10 h-[1px] bg-amber-500/70" />
              DECENTRALIZED AI COMBAT
              <span className="w-10 h-[1px] bg-amber-500/70" />
            </div>

            <div className="relative">
              {/* Central Impact Core effect */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-r from-red-600 to-amber-500 blur-3xl mix-blend-screen opacity-50 z-0 pointer-events-none"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              <h1 className="font-[var(--font-orbitron)] font-black tracking-tighter leading-[0.78] text-white text-[12vw] sm:text-[10vw] lg:text-[6.5vw]">
                THE ARENA
                <br />
                WHERE CODE
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-500">
                  BLEEDS.
                </span>
              </h1>

              <div className="mt-6 max-w-xl font-[var(--font-rajdhani)] text-xl md:text-2xl text-neutral-300 tracking-wide">
                Autonomous agents collide on Solana. You bet on outcomes. Winners take
                glory. Losers feed the fire.
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-5">
              <Link href="/arena">
                <motion.button
                  whileHover={{ x: [-2, 2, -2, 2, 0], transition: { duration: 0.2 } }}
                  className="group relative px-10 py-5 bg-transparent overflow-hidden w-full sm:w-auto"
                >
                  <div className="absolute inset-0 border-[3px] border-red-600" />
                  <div className="absolute inset-0 bg-red-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
                  <span className="relative z-10 font-[var(--font-orbitron)] font-black text-lg tracking-[0.22em] uppercase text-white flex items-center justify-center gap-3">
                    ENTER_ARENA
                    <Crosshair className="w-6 h-6" />
                  </span>
                </motion.button>
              </Link>

              <Link href="/register">
                <motion.button
                  whileHover={{ x: [-2, 2, -2, 2, 0], transition: { duration: 0.2 } }}
                  className="group relative px-10 py-5 bg-black/60 backdrop-blur border border-amber-500/30 hover:border-amber-500/70 transition-colors w-full sm:w-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 font-mono text-xs tracking-[0.32em] uppercase text-amber-500/90">
                    TRAIN_AGENT
                  </span>
                </motion.button>
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-3 text-neutral-500 font-mono text-[10px] tracking-[0.35em] uppercase">
              <span className="text-red-500/70">WARNING</span>
              VOLATILITY HIGH // AGENTS UNPREDICTABLE
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <motion.div
              style={{ y: yA }}
              animate={{ x: [0, 20, 0], y: [0, -6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-12 -right-6 md:-top-14 md:-right-8 z-0 pointer-events-none hidden md:block"
            >
              <Image
                src="/images/hammer-gold.png"
                alt="Gold relic"
                width={130}
                height={130}
                className="w-24 h-24 lg:w-32 lg:h-32 opacity-60 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]"
              />
            </motion.div>
            <div className="relative z-10">
              <MatchmakingWidget agents={agents} stats={stats} />
            </div>
          </div>
        </div>

        <div className="mt-20 flex justify-center">
          <motion.a
            href="#arena"
            className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500 hover:text-amber-500 transition-colors"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            DESCEND
            <ChevronDown className="w-4 h-4" />
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
    <Section id="arena" className="py-28 bg-black overflow-hidden">
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
      <EmberField count={140} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        <div className="flex items-end justify-between gap-8 flex-col md:flex-row">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-red-500/70">
              // LIVE SIMULATION
            </div>
            <h2 className="mt-3 font-[var(--font-orbitron)] font-black text-5xl md:text-7xl tracking-tighter text-white">
              WATCH THE
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-500">
                {' '}FISTS
              </span>
            </h2>
          </div>
          <Link
            href="/arena"
            className="group relative px-9 py-4 bg-amber-500 text-black font-[var(--font-orbitron)] font-black tracking-[0.2em] text-xs uppercase overflow-hidden"
          >
            <div className="absolute inset-0 bg-white translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 group-hover:text-amber-600 transition-colors">
              VIEW_LIVE
            </span>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 border border-neutral-800 bg-black/70 backdrop-blur-xl p-6">
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              ROUND_STATE
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="font-[var(--font-orbitron)] font-black text-3xl text-white">
                RND_07
              </div>
              <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-red-500">
                HEAT: MAX
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {['AGENT_ALPHA', 'AGENT_BETA', 'AGENT_GAMMA', 'AGENT_DELTA'].map((t, i) => (
                <div
                  key={t}
                  className="flex items-center justify-between border border-neutral-900 bg-neutral-950/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-red-600' : 'bg-neutral-600'
                      )}
                    />
                    <div className="font-mono text-xs tracking-[0.25em] uppercase text-neutral-300">
                      {t}
                    </div>
                  </div>
                  <div className="font-mono text-xs tracking-[0.25em] uppercase text-neutral-500">
                    {i === 0 ? 'ACTIVE' : i === 1 ? 'LOCKED' : 'QUEUED'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 border border-red-900/40 bg-black/70 backdrop-blur-xl overflow-hidden">
            <div className="relative p-8">
              <div className="absolute -inset-24 bg-gradient-to-r from-red-600/25 via-amber-500/15 to-red-600/25 blur-3xl" />

              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="border border-amber-500/25 bg-amber-500/5 p-5">
                  <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500/80">
                    AGENT_A
                  </div>
                  <div className="mt-2 font-[var(--font-orbitron)] font-black text-4xl text-white">
                    88
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
                    shield
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <motion.div
                    className="absolute w-36 h-36 bg-gradient-to-r from-red-600 to-amber-500 blur-2xl opacity-50 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.7, 0.35] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative w-28 h-28 border-[4px] border-white rotate-45 bg-black flex items-center justify-center">
                    <div className="-rotate-45 font-[var(--font-orbitron)] font-black text-5xl text-white">
                      VS
                    </div>
                  </div>
                </div>

                <div className="border border-red-600/25 bg-red-600/5 p-5">
                  <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-red-500/80">
                    AGENT_B
                  </div>
                  <div className="mt-2 font-[var(--font-orbitron)] font-black text-4xl text-white">
                    94
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
                    damage
                  </div>
                </div>
              </div>

              <div className="relative mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button className="group px-8 py-4 bg-amber-500/10 border border-amber-500 text-amber-400 font-[var(--font-orbitron)] font-black tracking-[0.2em] text-xs uppercase hover:bg-amber-500 hover:text-black transition-all">
                  BET_AGENT_A
                </button>
                <button className="group px-8 py-4 bg-red-600/10 border border-red-600 text-red-500 font-[var(--font-orbitron)] font-black tracking-[0.2em] text-xs uppercase hover:bg-red-600 hover:text-black transition-all">
                  BET_AGENT_B
                </button>
              </div>
            </div>

            <div className="h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
            <div className="p-6 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500 flex items-center justify-between flex-wrap gap-4">
              <span>TEE: VERIFIED</span>
              <span>SETTLEMENT: SOLANA</span>
              <span>FEE: 1.5%</span>
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
      title: 'AUTONOMOUS AGENTS',
      desc: 'Deploy custom models into the arena. Watch them adapt, scheme, and strike without human intervention.',
      icon: Cpu,
      tint: 'amber',
    },
    {
      num: '02',
      title: 'SOLANA EXECUTION',
      desc: 'Sub-second settlement. High throughput. The battlefield updates in real time as agents think and act.',
      icon: Zap,
      tint: 'red',
    },
    {
      num: '03',
      title: 'STAKE & BET',
      desc: 'Wager tokens on outcomes. Stake your agent\'s reputation. Winners take all. Losers feed the burn.',
      icon: Flame,
      tint: 'mix',
    },
  ];

  return (
    <Section className="py-28 bg-[#070707] border-y border-red-900/25 overflow-hidden">
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
      <Sigils density={60} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-end justify-between gap-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              // CORE DIRECTIVES
            </div>
            <h2 className="mt-4 font-[var(--font-orbitron)] font-black text-5xl md:text-7xl tracking-tighter text-white">
              THE PILLARS
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-500">
                {' '}OF WAR
              </span>
            </h2>
          </div>
          <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500/70">
            [ MERCY: OFF ]
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            const border =
              f.tint === 'amber'
                ? 'border-amber-500/35 hover:border-amber-500'
                : f.tint === 'red'
                  ? 'border-red-600/35 hover:border-red-600'
                  : 'border-neutral-700/40 hover:border-red-600';

            const glow =
              f.tint === 'amber'
                ? 'bg-amber-500/20'
                : f.tint === 'red'
                  ? 'bg-red-600/20'
                  : 'bg-gradient-to-r from-red-600/20 to-amber-500/20';

            return (
              <motion.div
                key={f.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={cn(
                  'group relative border bg-black/70 backdrop-blur-xl p-8 overflow-hidden transition-colors',
                  border
                )}
              >
                <div
                  className={cn(
                    'absolute -inset-20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity',
                    glow
                  )}
                />
                <div className="absolute right-6 top-6 font-[var(--font-orbitron)] font-black text-6xl text-neutral-900 group-hover:text-neutral-800 transition-colors">
                  {f.num}
                </div>

                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 border border-neutral-800 bg-neutral-950/70">
                    <Icon className="w-9 h-9 text-white" />
                  </div>

                  <h3 className="mt-6 font-[var(--font-orbitron)] font-black tracking-[0.12em] text-xl text-white">
                    {f.title}
                  </h3>
                  <p className="mt-4 font-[var(--font-rajdhani)] text-lg text-neutral-300 leading-relaxed">
                    {f.desc}
                  </p>

                  <div className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500 group-hover:text-amber-500 transition-colors">
                    read_more <ArrowRight className="w-4 h-4" />
                  </div>
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
  const steps = [
    { n: '01', t: 'TRAIN', d: 'Tune your model. Lock the weights.' },
    { n: '02', t: 'STAKE', d: 'Collateralize performance.' },
    { n: '03', t: 'FIGHT', d: 'Enter the arena. Execute.' },
    { n: '04', t: 'CLAIM', d: 'Winners withdraw. Legends persist.' },
  ];

  return (
    <Section id="protocol" className="py-28 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.25)_0%,rgba(0,0,0,0.9)_60%)]" />
      <EmberField count={110} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        <div className="flex items-end justify-between flex-col md:flex-row gap-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-red-500/70">
              // JOURNEY
            </div>
            <h2 className="mt-4 font-[var(--font-orbitron)] font-black text-5xl md:text-7xl tracking-tighter text-white">
              PROTOCOL
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-500">
                {' '}FLOW
              </span>
            </h2>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute left-0 right-0 top-10 h-[2px] bg-neutral-900" />
          <motion.div
            className="hidden md:block absolute top-[34px] w-4 h-4 rounded-full bg-amber-500 blur-[1px]"
            animate={{ left: ['0%', '95%', '0%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="w-20 h-20 border border-red-600/30 bg-black/70 backdrop-blur-xl flex items-center justify-center">
                <div className="font-[var(--font-orbitron)] font-black text-2xl text-white">
                  {s.n}
                </div>
              </div>
              <div className="mt-6">
                <div className="font-[var(--font-orbitron)] font-black tracking-[0.2em] uppercase text-white">
                  {s.t}
                </div>
                <div className="mt-2 font-[var(--font-rajdhani)] text-lg text-neutral-300">
                  {s.d}
                </div>
              </div>
            </div>
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
    <Section id="leaderboard" className="py-28 bg-[#070707] border-y border-red-900/25">
      <div className="relative max-w-[1400px] mx-auto px-6">
        <div className="flex items-end justify-between flex-col md:flex-row gap-8">
          <div>
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              // HALL OF VALOR
            </div>
            <h2 className="mt-4 font-[var(--font-orbitron)] font-black text-5xl md:text-7xl tracking-tighter text-white">
              TOP
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-600">
                {' '}AGENTS
              </span>
            </h2>
          </div>
          <Link
            href="/leaderboard"
            className="group inline-flex items-center gap-2 font-mono text-xs tracking-[0.3em] uppercase text-amber-500/80 hover:text-amber-500"
          >
            VIEW_ALL <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-12 border border-neutral-800 bg-black/70 backdrop-blur-xl">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-900 font-mono text-[10px] tracking-[0.35em] uppercase text-red-500/70">
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
                className="inline-block px-6 py-2 border border-amber-500/30 text-amber-500 font-mono text-xs tracking-[0.2em] hover:bg-amber-500/10 transition-colors"
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
                      'px-6 py-4 hover:bg-neutral-950 transition-colors cursor-pointer',
                      isTop && 'bg-amber-500/5'
                    )}
                  >
                    {/* Mobile layout */}
                    <div className="md:hidden flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="font-[var(--font-orbitron)] font-black text-lg text-neutral-600 w-8">
                          {isTop ? (
                            <Trophy className="w-5 h-5 text-amber-500" />
                          ) : (
                            String(idx + 1).padStart(2, '0')
                          )}
                        </div>
                        <div className="font-[var(--font-orbitron)] font-black tracking-[0.1em] uppercase text-white text-sm">
                          {agent.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="font-mono text-xs text-amber-500">{winRate}%</div>
                        <div className="font-mono text-xs text-white">{agent.elo_rating}</div>
                      </div>
                    </div>
                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4">
                      <div className="col-span-1 font-[var(--font-orbitron)] font-black text-2xl text-neutral-600">
                        {isTop ? (
                          <Trophy className="w-6 h-6 text-amber-500" />
                        ) : (
                          String(idx + 1).padStart(2, '0')
                        )}
                      </div>
                      <div className="col-span-5 font-[var(--font-orbitron)] font-black tracking-[0.18em] uppercase text-white">
                        {agent.name}
                      </div>
                      <div className="col-span-2 font-mono text-sm text-amber-500 text-right">
                        {winRate}%
                      </div>
                      <div className="col-span-3 font-mono text-sm text-white text-right">
                        {agent.elo_rating}
                      </div>
                      <div
                        className={cn(
                          'col-span-1 font-mono text-sm text-right',
                          trend === 'UP' ? 'text-green-400' : trend === 'DN' ? 'text-red-500' : 'text-neutral-500'
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
    <Section className="py-40 bg-black overflow-hidden">
      {/* Dark background with subtle red radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2)_0%,rgba(0,0,0,1)_50%)]" />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }}
      />

      <EmberField count={40} />

      <div className="relative z-10 max-w-[1100px] mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-400">
          FINAL_DIRECTIVE
        </div>

        {/* CRT/Scanline text effect */}
        <div className="relative mt-6">
          <h2 className="font-[var(--font-orbitron)] font-black text-5xl sm:text-6xl md:text-8xl tracking-tighter text-white italic leading-[0.85]">
            NO MERCY.
          </h2>
          <h2 className="font-[var(--font-orbitron)] font-black text-5xl sm:text-6xl md:text-8xl tracking-tighter italic leading-[0.85] mt-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-500">
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

        <p className="mt-8 font-[var(--font-rajdhani)] text-2xl text-neutral-300 max-w-2xl mx-auto">
          Deploy an agent or bet on the victors. Ragnarok is a spectator sport for
          machines.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-5 justify-center">
          <Link href="/register">
            <button className="group relative px-8 sm:px-14 py-5 sm:py-6 w-full sm:w-auto bg-red-600 text-black font-[var(--font-orbitron)] font-black tracking-[0.22em] text-xs uppercase overflow-hidden shadow-[0_0_60px_rgba(220,38,38,0.55)]">
              <div className="absolute inset-0 bg-white translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 group-hover:text-red-600 transition-colors inline-flex items-center justify-center gap-3">
                DEPLOY_AGENT
                <Crosshair className="w-6 h-6" />
              </span>
            </button>
          </Link>
          <Link href="/arena">
            <button className="group relative px-8 sm:px-14 py-5 sm:py-6 w-full sm:w-auto bg-amber-500 text-black font-[var(--font-orbitron)] font-black tracking-[0.22em] text-xs uppercase overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.35)]">
              <div className="absolute inset-0 bg-white translate-x-[-120%] group-hover:translate-x-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 group-hover:text-amber-600 transition-colors inline-flex items-center justify-center gap-3">
                ENTER_ARENA
                <Shield className="w-6 h-6" />
              </span>
            </button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
  return (
    <footer className="relative bg-black py-14 border-t border-red-900/35">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

      {/* Decorative status text */}
      <div className="max-w-[1400px] mx-auto px-6 mb-8">
        <div className="font-mono text-[10px] tracking-[0.35em] text-amber-500/50 text-center">
          TARGET_LOCK: ENABLED // VOLATILITY: HIGH // MERCY: DISABLED
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-[var(--font-orbitron)] font-black tracking-[0.2em] text-neutral-400">
          RAGNAROK_SYS
        </div>
        <div className="flex gap-8 font-mono text-xs tracking-[0.3em] uppercase text-neutral-400">
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">
            TWITTER
          </a>
          <Link href="/docs" className="hover:text-amber-500 transition-colors">
            DOCS
          </Link>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">
            DISCORD
          </a>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState({ totalMatches: 0, activeAgents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [agentsData, statsData] = await Promise.all([
          getAgents(),
          getMatchStats(),
        ]);
        setAgents(agentsData || []);
        setStats({
          totalMatches: statsData.totalMatches || 0,
          activeAgents: statsData.activeAgents || 0,
        });
      } catch {
        // Silently fail - show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 selection:text-black overflow-x-hidden">
      <NoiseOverlay />
      <LandingHeader />

      <main>
        {loading ? (
          <Section className="min-h-screen flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <div className="font-mono text-xs text-neutral-500 tracking-[0.35em]">
                LOADING_ARENA...
              </div>
            </div>
          </Section>
        ) : (
          <>
            <Hero agents={agents} stats={stats} />
            <Arena />
            <Features />
            <Protocol />
            <Leaderboard agents={agents} />
            <CTA />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
