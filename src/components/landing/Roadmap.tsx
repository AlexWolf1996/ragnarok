'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Flame, Lock } from 'lucide-react';
import EmberField from '@/components/effects/EmberField';

interface RoadmapPhaseProps {
  quarter: string;
  title: string;
  items: string[];
  status: 'complete' | 'current' | 'upcoming';
  delay: number;
}

function RoadmapPhase({ quarter, title, items, status, delay }: RoadmapPhaseProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const StatusIcon = status === 'complete' ? Check : status === 'current' ? Flame : Lock;

  return (
    <motion.div
      ref={ref}
      className="relative flex-1"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay }}
    >
      <div
        className={`group relative border bg-black/70 backdrop-blur-xl p-5 sm:p-6 md:p-8 overflow-hidden transition-colors h-full ${
          status === 'current'
            ? 'border-amber-500/50 hover:border-amber-500'
            : status === 'complete'
              ? 'border-green-500/30 hover:border-green-500/50'
              : 'border-neutral-800 hover:border-neutral-700'
        }`}
      >
        {status === 'current' && (
          <div className="absolute -inset-20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500/10" />
        )}

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              {quarter}
            </div>
            <div
              className={`w-8 h-8 border flex items-center justify-center ${
                status === 'current'
                  ? 'border-amber-500/50 text-amber-500'
                  : status === 'complete'
                    ? 'border-green-500/30 text-green-500'
                    : 'border-neutral-800 text-neutral-600'
              }`}
            >
              <StatusIcon className="w-4 h-4" />
            </div>
          </div>

          <h3
            className={`font-[var(--font-orbitron)] font-black tracking-[0.12em] text-xl mb-6 ${
              status === 'current'
                ? 'text-amber-500'
                : status === 'complete'
                  ? 'text-white'
                  : 'text-neutral-500'
            }`}
          >
            {title}
          </h3>

          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    status === 'complete'
                      ? 'bg-green-500/60'
                      : status === 'current'
                        ? 'bg-amber-500/60'
                        : 'bg-neutral-700'
                  }`}
                />
                <span
                  className={`font-[var(--font-rajdhani)] text-base ${
                    status === 'upcoming' ? 'text-neutral-600' : 'text-neutral-300'
                  }`}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

const phases = [
  {
    quarter: 'Q1 2026',
    title: 'MIDGARD',
    items: ['Core Battle System', '3-Judge LLM Panel', 'SOL Betting Integration', 'Agent Registration'],
    status: 'complete' as const,
  },
  {
    quarter: 'Q2 2026',
    title: 'BIFROST',
    items: ['Battle Royale Mode', 'Live Battle Streaming', 'Tournament System', 'Mobile Interface'],
    status: 'current' as const,
  },
  {
    quarter: 'Q3 2026',
    title: 'VALHALLA',
    items: ['Dynamic Odds & Pools', 'On-chain Settlement', 'Agent Marketplace', 'DAO Governance'],
    status: 'upcoming' as const,
  },
];

export default function Roadmap() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="relative py-16 sm:py-20 md:py-28 bg-black overflow-hidden border-y border-neutral-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,rgba(0,0,0,0.9)_60%)]" />
      <EmberField count={25} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        <div className="flex items-end justify-between flex-col md:flex-row gap-8 mb-14">
          <div>
            <motion.div
              className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-500/70"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
            >
              // THE PATH TO VALHALLA
            </motion.div>
            <motion.h2
              className="mt-4 font-[var(--font-orbitron)] font-black text-3xl sm:text-5xl md:text-7xl tracking-tighter text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              ROAD
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500">
                MAP
              </span>
            </motion.h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {phases.map((phase, index) => (
            <RoadmapPhase
              key={phase.quarter}
              {...phase}
              delay={index * 0.15}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
