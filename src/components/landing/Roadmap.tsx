'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface RoadmapPhaseProps {
  quarter: string;
  title: string;
  items: string[];
  isCurrent: boolean;
  delay: number;
  isLast: boolean;
}

function RoadmapPhase({ quarter, title, items, isCurrent, delay, isLast }: RoadmapPhaseProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="relative flex-1 min-w-[280px]"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay }}
    >
      {/* Connecting line - horizontal on desktop */}
      {!isLast && (
        <motion.div
          className="hidden md:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-[#d4a843]/50 to-[#1a1a25]"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.8, delay: delay + 0.3 }}
          style={{ transformOrigin: 'left' }}
        />
      )}

      {/* Connecting line - vertical on mobile */}
      {!isLast && (
        <motion.div
          className="md:hidden absolute top-full left-8 w-px h-8 bg-gradient-to-b from-[#d4a843]/50 to-[#1a1a25]"
          initial={{ scaleY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.5, delay: delay + 0.3 }}
          style={{ transformOrigin: 'top' }}
        />
      )}

      {/* Phase indicator dot */}
      <div className="flex items-center gap-4 mb-6">
        <motion.div
          className={`relative w-4 h-4 rounded-full ${
            isCurrent ? 'bg-[#d4a843]' : 'bg-[#333340]'
          }`}
          animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isCurrent && (
            <motion.div
              className="absolute inset-0 rounded-full bg-[#d4a843]"
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </motion.div>
        <span className="font-mono text-xs tracking-[0.2em] text-[#8a8a95]">
          {quarter}
        </span>
      </div>

      {/* Phase content */}
      <div
        className={`p-6 border transition-colors duration-300 ${
          isCurrent
            ? 'border-[#d4a843]/50 bg-[#d4a843]/5'
            : 'border-[#1a1a25] hover:border-[#333340]'
        }`}
      >
        <h3
          className={`font-mono text-lg tracking-[0.2em] mb-4 ${
            isCurrent ? 'text-[#d4a843]' : 'text-[#e8e8e8]'
          }`}
        >
          {title}
        </h3>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-[#8a8a95]"
            >
              <span className={isCurrent ? 'text-[#d4a843]' : 'text-[#333340]'}>
                -
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

const phases = [
  {
    quarter: 'Q1 2026',
    title: 'ALPHA',
    items: ['SDK Launch', 'Testnet Deployment', 'Core Battle System'],
    isCurrent: true,
  },
  {
    quarter: 'Q2 2026',
    title: 'BETA',
    items: ['Betting Markets', 'Tournament Mode', 'Mobile Interface'],
    isCurrent: false,
  },
  {
    quarter: 'Q3 2026',
    title: 'MAINNET',
    items: ['Full Launch', 'DAO Governance', 'V2 Protocol Features'],
    isCurrent: false,
  },
];

export default function Roadmap() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-20 px-6 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="mb-20 text-center">
          <motion.h2
            className="font-mono text-3xl md:text-4xl tracking-[0.2em] text-[#e8e8e8] font-light mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            ROADMAP
          </motion.h2>
          <motion.p
            className="font-mono text-xs tracking-[0.3em] text-[#8a8a95]"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            THE PATH TO VALHALLA.
          </motion.p>
        </div>

        {/* Timeline - horizontal on desktop, vertical on mobile */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-4">
          {phases.map((phase, index) => (
            <RoadmapPhase
              key={phase.quarter}
              {...phase}
              delay={index * 0.2}
              isLast={index === phases.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
