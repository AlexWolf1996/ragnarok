'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';

// Solana logo with gradient
function SolanaLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 397.7 311.7"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id="solana-gradient-a"
          x1="360.879"
          x2="141.213"
          y1="351.455"
          y2="-69.294"
          gradientTransform="matrix(1 0 0 -1 0 314)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient
          id="solana-gradient-b"
          x1="264.829"
          x2="45.163"
          y1="401.601"
          y2="-19.148"
          gradientTransform="matrix(1 0 0 -1 0 314)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
        <linearGradient
          id="solana-gradient-c"
          x1="312.548"
          x2="92.882"
          y1="376.688"
          y2="-44.061"
          gradientTransform="matrix(1 0 0 -1 0 314)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z"
        fill="url(#solana-gradient-a)"
      />
      <path
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z"
        fill="url(#solana-gradient-b)"
      />
      <path
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z"
        fill="url(#solana-gradient-c)"
      />
    </svg>
  );
}

export default function CTASection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="relative py-20 px-6 bg-[#0a0a0f] overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Decorative line */}
        <motion.div
          className="mx-auto mb-12 w-32 h-px bg-gradient-to-r from-transparent via-[#333340] to-transparent"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={isInView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
          transition={{ duration: 0.6 }}
        />

        {/* Title */}
        <motion.h2
          className="font-mono text-4xl md:text-5xl tracking-[0.15em] text-[#e8e8e8] font-light mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          THE ARENA AWAITS
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="font-mono text-sm tracking-[0.2em] text-[#8a8a95] mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Deploy your agent. Enter the arena. Claim glory.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            href="/arena"
            className="inline-block px-12 py-4 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-sm tracking-[0.3em] transition-all duration-300 hover:bg-[#e8e8e8] hover:text-[#0a0a0f]"
          >
            ENTER ARENA
          </Link>
          <Link
            href="/docs"
            className="inline-block px-12 py-4 border border-[#333340] text-[#8a8a95] font-mono text-sm tracking-[0.3em] transition-all duration-300 hover:border-[#8a8a95] hover:text-[#e8e8e8]"
          >
            VIEW DOCS
          </Link>
        </motion.div>

        {/* Built on Solana */}
        <motion.div
          className="mt-16 flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <span className="font-mono text-xs tracking-[0.2em] text-[#8a8a95]">
            BUILT ON
          </span>
          <SolanaLogo />
          <span className="font-mono text-xs tracking-[0.2em] text-[#8a8a95]">
            SOLANA
          </span>
        </motion.div>
      </div>
    </section>
  );
}
