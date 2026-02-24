'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Users, Clock, X } from 'lucide-react';
import { ArenaTier, TIER_CONFIG, QueueStats } from '@/types/battleRoyale';
import { getQueueStats, joinQueue, leaveQueue, getUserQueueEntry } from '@/lib/supabase/battleRoyale';
import TierSelector from './TierSelector';

interface MatchmakingQueueProps {
  agentId: string;
  onMatched?: (matchId: string) => void;
}

export default function MatchmakingQueue({ agentId, onMatched }: MatchmakingQueueProps) {
  const [selectedTier, setSelectedTier] = useState<ArenaTier>('midgard');
  const [queueStats, setQueueStats] = useState<QueueStats[]>([]);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load queue stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getQueueStats();
        setQueueStats(stats);
      } catch (err) {
        console.error('Error loading queue stats:', err);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  // Check if already in queue
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const entry = await getUserQueueEntry(agentId);
        if (entry) {
          setIsInQueue(true);
          setQueueId(entry.id);
          setSelectedTier(entry.tier);
        }
      } catch (err) {
        console.error('Error checking queue:', err);
      }
    };

    checkQueue();
  }, [agentId]);

  const handleJoinQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await joinQueue(agentId, selectedTier);
      if (result.success) {
        setIsInQueue(true);
        setQueueId(result.queue_id || null);
        setPosition(result.position || null);

        // If immediately matched, the queue_id will contain match info
        // For now, we wait for the real-time subscription to notify us
      } else {
        setError(result.error || 'Failed to join queue');
      }
    } catch (err) {
      setError('Failed to join queue');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!queueId) return;

    setLoading(true);
    try {
      const result = await leaveQueue(queueId);
      if (result.success) {
        setIsInQueue(false);
        setQueueId(null);
        setPosition(null);
      }
    } catch (err) {
      console.error('Error leaving queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentTierStats = queueStats.find((s) => s.tier === selectedTier);

  return (
    <div className="bg-[#111118] border border-[#2a2a35] rounded-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-sm text-[#e8e8e8] tracking-wider">
          MATCHMAKING QUEUE
        </h3>
        {currentTierStats && (
          <div className="flex items-center gap-2 text-[#888890]">
            <Users size={12} aria-hidden="true" />
            <span className="font-mono text-xs">
              {currentTierStats.waiting_count} waiting
            </span>
          </div>
        )}
      </div>

      {/* Tier Selection */}
      <div className="mb-4">
        <TierSelector
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          disabled={isInQueue}
        />
      </div>

      {/* Queue Status */}
      <AnimatePresence mode="wait">
        {isInQueue ? (
          <motion.div
            key="in-queue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-6"
          >
            <Loader2
              className="w-8 h-8 text-[#4fc3f7] mx-auto mb-3 animate-spin"
              aria-hidden="true"
            />
            <p className="font-mono text-sm text-[#e8e8e8] mb-1">
              Searching for opponent...
            </p>
            {position && (
              <p className="font-mono text-xs text-[#666670]">
                Position in queue: {position}
              </p>
            )}
            {currentTierStats && (
              <div className="flex items-center justify-center gap-1 text-[#666670] mt-2">
                <Clock size={12} aria-hidden="true" />
                <span className="font-mono text-xs">
                  Est. wait: {Math.floor(currentTierStats.estimated_wait_seconds / 60)}m{' '}
                  {currentTierStats.estimated_wait_seconds % 60}s
                </span>
              </div>
            )}

            <button
              onClick={handleLeaveQueue}
              disabled={loading}
              className="mt-4 px-4 py-2 font-mono text-xs tracking-wider
                       border border-[#ef4444]/50 text-[#ef4444] rounded-sm
                       hover:bg-[#ef4444]/10 transition-colors duration-200
                       disabled:opacity-50"
            >
              <X size={12} className="inline mr-1" aria-hidden="true" />
              LEAVE QUEUE
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="not-in-queue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Queue info */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {queueStats.map((stat) => {
                const config = TIER_CONFIG[stat.tier];
                return (
                  <div
                    key={stat.tier}
                    className="text-center p-2 bg-[#0a0a0f] rounded-sm border border-[#1a1a25]"
                  >
                    <div
                      className="font-mono text-lg font-semibold"
                      style={{ color: config.color }}
                    >
                      {stat.waiting_count}
                    </div>
                    <div className="font-mono text-[10px] text-[#666670]">
                      {config.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="font-mono text-xs text-[#ef4444] mb-3">{error}</p>
            )}

            <button
              onClick={handleJoinQueue}
              disabled={loading}
              className="w-full py-3 font-mono text-sm tracking-wider
                       bg-[#d4a843] text-[#0a0a0f] rounded-sm
                       hover:bg-[#e4b853] transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'FIND MATCH'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
