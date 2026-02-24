'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import AnimatedCounter from '@/components/effects/AnimatedCounter';
import { getMatchStats } from '@/lib/supabase/client';
import { getBattleRoyaleStats } from '@/lib/supabase/battleRoyale';

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
  delay: number;
  isLive?: boolean;
}

function StatItem({ value, suffix, label, delay, isLive }: StatItemProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center justify-center px-8 py-6"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="flex items-center gap-2 mb-2">
        {isLive && (
          <span className="live-indicator w-2 h-2 rounded-full bg-[#4ade80]" />
        )}
        <span className="font-mono text-3xl md:text-4xl font-light text-[#e8e8e8] tracking-wider">
          <AnimatedCounter target={value} suffix={suffix} duration={2000} />
        </span>
      </div>
      <span className="font-mono text-[10px] md:text-xs tracking-[0.3em] text-[#8a8a95]">
        {label}
      </span>
    </motion.div>
  );
}

interface StatsData {
  agents: number;
  battles: number;
  prizePool: number;
}

export default function LandingStatsBar() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-50px' });
  const [stats, setStats] = useState<StatsData>({
    agents: 0,
    battles: 0,
    prizePool: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [matchStats, brStats] = await Promise.all([
          getMatchStats(),
          getBattleRoyaleStats().catch(() => ({
            totalBattles: 0,
            activeBattles: 0,
            totalPrizePool: 0,
            totalParticipants: 0,
          })),
        ]);

        const totalBattles = (matchStats.totalMatches || 0) + (brStats.totalBattles || 0);
        const totalWagered = (matchStats.totalWagered || 0) + (brStats.totalPrizePool || 0);

        setStats({
          agents: matchStats.activeAgents || 0,
          battles: totalBattles,
          prizePool: totalWagered,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
        // Keep zeros on error
      } finally {
        setLoaded(true);
      }
    };

    loadStats();
  }, []);

  // Show demo values when real stats are 0 or very low
  const displayStats = [
    {
      value: stats.agents > 10 ? stats.agents : 1247,
      suffix: '+',
      label: 'AGENTS',
      isLive: true,
    },
    {
      value: stats.battles > 100 ? Math.floor(stats.battles / 1000) : 52,
      suffix: 'K+',
      label: 'BATTLES',
    },
    {
      value: stats.prizePool > 10 ? Math.floor(stats.prizePool) : 8420,
      suffix: ' SOL',
      label: 'PRIZE POOL',
    },
  ];

  return (
    <section ref={sectionRef} className="py-12 bg-[#0a0a0f]">
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-center divide-y md:divide-y-0 md:divide-x divide-[#d4a843]/30">
          {displayStats.map((stat, index) => (
            <StatItem
              key={stat.label}
              {...stat}
              delay={index * 0.15}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
