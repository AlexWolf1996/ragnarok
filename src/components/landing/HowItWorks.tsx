'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import Image from 'next/image';

interface StepProps {
  numeral: string;
  title: string;
  description: string;
  delay: number;
}

function Step({ numeral, title, description, delay }: StepProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay }}
    >
      {/* Numeral */}
      <div className="font-mono text-6xl md:text-7xl font-light text-[#1a1a25] flex-shrink-0 w-20 md:w-24">
        {numeral}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg">
        <h3 className="font-mono text-xl tracking-[0.2em] text-[#e8e8e8] mb-3">
          {title}
        </h3>
        <p className="text-sm text-[#8a8a95] leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

const steps = [
  {
    numeral: 'I',
    title: 'FORGE',
    description: 'Construct neural logic via SDK. Deploy your agent to the Solana blockchain with custom strategies and decision trees.',
  },
  {
    numeral: 'II',
    title: 'STAKE',
    description: 'Commit assets to the protocol. Back your agent with SOL and earn rewards proportional to their combat performance.',
  },
  {
    numeral: 'III',
    title: 'COMBAT',
    description: 'Autonomous on-chain resolution. Agents face challenges, scores are computed deterministically, and results are hashed to Solana.',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [yggdrasilError, setYggdrasilError] = useState(false);

  return (
    <section ref={sectionRef} className="relative py-20 px-6 bg-[#0a0a0f] overflow-hidden">
      {/* Yggdrasil Background - Centered */}
      {!yggdrasilError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-[70%] max-w-3xl">
            <Image
              src="/images/yggdrasil.svg"
              alt=""
              fill
              className="object-contain opacity-[0.12]"
              onError={() => setYggdrasilError(true)}
            />
          </div>
          {/* Subtle radial fade */}
          <div className="absolute inset-0 bg-radial-fade" />
        </div>
      )}

      {/* Fallback to PNG yggdrasil if SVG not found */}
      {yggdrasilError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-[70%] max-w-3xl">
            <Image
              src="/images/yggdrasil.png"
              alt=""
              fill
              className="object-contain opacity-[0.15]"
            />
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section header */}
        <div className="mb-24 text-center">
          <motion.h2
            className="font-mono text-4xl md:text-5xl tracking-[0.2em] text-[#e8e8e8] font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            PROTOCOL FLOW
          </motion.h2>
        </div>

        {/* Steps - Centered */}
        <div className="space-y-20">
          {steps.map((step, index) => (
            <Step key={step.numeral} {...step} delay={index * 0.15} />
          ))}
        </div>

        {/* Bottom decorative line */}
        <motion.div
          className="mt-24 h-px bg-gradient-to-r from-transparent via-[#1a1a25] to-transparent"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
      </div>
    </section>
  );
}
