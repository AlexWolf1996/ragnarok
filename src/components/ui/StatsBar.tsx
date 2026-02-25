'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Bot, Trophy, Coins } from 'lucide-react';
import { getMatchStats } from '@/lib/supabase/client';

interface Stats {
  totalMatches: number;
  activeAgents: number;
  topAgent: { name: string; elo_rating: number } | null;
  totalWagered: number;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  delay: number;
}

function StatCard({ icon, label, value, subValue, delay }: StatCardProps) {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 bg-[#111118] rounded-lg border border-[#c9a84c]/10"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="text-[#c9a84c]">{icon}</div>
      <div>
        <p className="text-[10px] font-mono text-[#71717a] uppercase tracking-[0.2em]">{label}</p>
        <p className="font-mono text-sm text-[#e8e8e8]">{value}</p>
        {subValue && <p className="text-[10px] font-mono text-[#c9a84c]">{subValue}</p>}
      </div>
    </motion.div>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadStats() {
    try {
      const data = await getMatchStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-40 h-16 bg-[#111118] rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      <StatCard
        icon={<Swords size={18} />}
        label="Total Battles"
        value={stats?.totalMatches || 0}
        delay={0}
      />
      <StatCard
        icon={<Bot size={18} />}
        label="Active Agents"
        value={stats?.activeAgents || 0}
        delay={0.1}
      />
      <StatCard
        icon={<Trophy size={18} />}
        label="Top Champion"
        value={stats?.topAgent?.name || 'None'}
        subValue={stats?.topAgent ? `ELO: ${stats.topAgent.elo_rating}` : undefined}
        delay={0.2}
      />
      <StatCard
        icon={<Coins size={18} />}
        label="Total Wagered"
        value={`${(stats?.totalWagered || 0).toFixed(2)} SOL`}
        delay={0.3}
      />
    </div>
  );
}
