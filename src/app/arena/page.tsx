'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Swords, Plus, RefreshCw, Loader2, Crown } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Tables } from '@/lib/supabase/types';
import {
  getAgentByWallet,
} from '@/lib/supabase/client';
import {
  getOpenBattles,
  getLiveBattles,
  getCompletedBattles,
  getBattleById,
  joinBattle,
  subscribeToOpenBattles,
  unsubscribe,
} from '@/lib/supabase/battleRoyale';
import { transferToTreasury, BettingTier } from '@/lib/solana/transfer';
import { ArenaTier, ArenaMode, BattleRoyaleWithRelations } from '@/types/battleRoyale';
import StatsBar from '@/components/ui/StatsBar';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CosmicBackground from '@/components/ui/CosmicBackground';
import { useToast } from '@/hooks/useToast';
import { useCurrentMatch } from '@/hooks/useCurrentMatch';
import MatchLiveView from '@/components/arena/MatchLiveView';
import RecentMatchesFeed from '@/components/arena/RecentMatchesFeed';
import BetPanel from '@/components/arena/BetPanel';
import SubmitChallenge from '@/components/arena/SubmitChallenge';
import {
  TierSelector,
  ModeToggle,
  BattleRoyaleCard,
  BattleRoyaleLive,
  MatchmakingQueue,
  CreateBattleRoyale,
  BettingModal,
  UpcomingSchedule,
} from '@/components/arena';

type Agent = Tables<'agents'>;

function ArenaContent() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const wallet = useWallet();
  const { connection } = useConnection();
  const toast = useToast();
  const hasShownRegistrationToast = useRef(false);

  // Mode & Tier state
  const [mode, setMode] = useState<ArenaMode>('duel');
  const [tier, setTier] = useState<ArenaTier>('midgard');

  // User's agent
  const [userAgent, setUserAgent] = useState<Agent | null>(null);

  // Duel mode: current match + selected side for betting
  const { match: currentMatch } = useCurrentMatch();
  const [selectedSide, setSelectedSide] = useState<'A' | 'B' | null>(null);

  // Battle Royale state
  const [openBattles, setOpenBattles] = useState<BattleRoyaleWithRelations[]>([]);
  const [liveBattles, setLiveBattles] = useState<BattleRoyaleWithRelations[]>([]);
  const [completedBattles, setCompletedBattles] = useState<BattleRoyaleWithRelations[]>([]);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [showCreateBattle, setShowCreateBattle] = useState(false);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [bettingAgentId, setBettingAgentId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Show registration success toast once
  useEffect(() => {
    if (justRegistered && !hasShownRegistrationToast.current) {
      hasShownRegistrationToast.current = true;
      toast.success('Agent Registered', 'Your agent is ready for battle!');
    }
  }, [justRegistered, toast]);

  // Load user's agent
  useEffect(() => {
    const loadUserAgent = async () => {
      if (wallet.publicKey) {
        try {
          const agent = await getAgentByWallet(wallet.publicKey.toString());
          setUserAgent(agent);
        } catch {
          // Failed to load user agent
        }
      } else {
        setUserAgent(null);
      }
    };
    loadUserAgent();
  }, [wallet.publicKey]);

  // Load Battle Royale data
  const loadBattleRoyaleData = useCallback(async () => {
    try {
      setLoading(true);
      const [openData, liveData, completedData] = await Promise.all([
        getOpenBattles(tier),
        getLiveBattles(tier),
        getCompletedBattles(tier, 5),
      ]);
      setOpenBattles(openData);
      setLiveBattles(liveData);
      setCompletedBattles(completedData);
    } catch {
      toast.error('Load Failed', 'Could not load battle data.');
    } finally {
      setLoading(false);
    }
  }, [tier, toast]);

  // Load BR data when switching to ragnarok mode
  useEffect(() => {
    if (mode === 'ragnarok') {
      loadBattleRoyaleData();
      const channel = subscribeToOpenBattles(() => {
        loadBattleRoyaleData();
      });
      return () => { unsubscribe(channel); };
    }
  }, [mode, loadBattleRoyaleData]);

  const [isJoiningBattle, setIsJoiningBattle] = useState(false);

  const handleJoinBattle = async (battleId: string) => {
    if (!userAgent) {
      toast.warning('Agent Required', 'Please register an agent first.');
      return;
    }
    if (!wallet.connected || !wallet.publicKey) {
      toast.warning('Wallet Required', 'Please connect your wallet to join.');
      return;
    }
    if (isJoiningBattle) return;

    setIsJoiningBattle(true);
    try {
      // Fetch battle to get tier/buy-in info
      const battle = await getBattleById(battleId);
      if (!battle) {
        toast.error('Error', 'Battle not found.');
        return;
      }

      // Transfer SOL buy-in to treasury
      toast.info('Payment', `Sending ${battle.buy_in_sol} SOL buy-in...`);
      const transferResult = await transferToTreasury(
        wallet as Parameters<typeof transferToTreasury>[0],
        battle.tier as BettingTier,
        connection
      );

      if (!transferResult.success || !transferResult.signature) {
        toast.error('Payment Failed', transferResult.error || 'Transaction failed');
        return;
      }

      // Register in the battle with tx proof
      toast.info('Joining', 'Verifying payment and registering...');
      const joinResult = await joinBattle(
        battleId,
        userAgent.id,
        wallet.publicKey.toString(),
        transferResult.signature
      );

      if (joinResult.success) {
        toast.success('Joined!', `${userAgent.name} has entered the battle!`);
        await loadBattleRoyaleData();
      } else {
        toast.error('Join Failed', joinResult.error || 'Could not join battle');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Join Failed', msg);
    } finally {
      setIsJoiningBattle(false);
    }
  };

  const handleViewBattle = (battleId: string) => {
    setSelectedBattleId(battleId);
  };

  const handleBattleBet = (agentId: string) => {
    if (!wallet.connected) {
      toast.warning('Wallet Required', 'Please connect your wallet to place bets.');
      return;
    }
    setBettingAgentId(agentId);
    setShowBettingModal(true);
  };

  if (loading && mode === 'ragnarok') {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center relative z-10">
          <Loader2 size={32} className="text-amber-500 animate-spin mx-auto mb-4" />
          <p className="font-[var(--font-orbitron)] text-sm text-amber-500/70 tracking-wider">THE GATES OF BATTLE OPEN...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] py-4 px-3 sm:py-8 sm:px-6 relative">
      <CosmicBackground showParticles={true} showRunes={true} particleCount={25} />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-[var(--font-orbitron)] text-2xl sm:text-3xl md:text-4xl tracking-[0.15em] text-white font-bold mb-2" style={{ textShadow: '0 0 40px rgba(220, 38, 38, 0.4)' }}>
            HALLS OF BATTLE
          </h1>
          <p className="font-[var(--font-rajdhani)] text-sm tracking-[0.15em] text-neutral-400">
            WHERE CHAMPIONS FORGE THEIR LEGEND IN BLOOD AND CODE
          </p>
        </motion.div>

        {/* Mode toggle + Tier (tier only in Ragnarok mode) */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ModeToggle mode={mode} onModeChange={setMode} />
          {mode === 'ragnarok' && (
            <TierSelector selectedTier={tier} onTierChange={setTier} />
          )}
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatsBar />
        </motion.div>

        {/* Content based on mode */}
        <AnimatePresence mode="wait">
          {mode === 'duel' ? (
            <motion.div
              key="duel-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Main area: Live Match + Recent */}
              <div className="lg:col-span-2 space-y-6">
                <MatchLiveView
                  selectedSide={selectedSide}
                  onSelectSide={setSelectedSide}
                />

                {/* Submit Challenge */}
                <SubmitChallenge />

                {/* Recent Battles Feed */}
                <section>
                  <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-4 flex items-center gap-2">
                    <Swords size={16} className="text-[#D4A843]/70" />
                    RECENT BATTLES
                  </h2>
                  <RecentMatchesFeed />
                </section>
              </div>

              {/* Right Sidebar — Betting + Schedule */}
              <aside className="space-y-6">
                {/* Bet Panel */}
                <BetPanel match={currentMatch} selectedSide={selectedSide} />

                {/* Upcoming Matches */}
                <div className="bg-[#111] border border-[#1a1a1a] p-6">
                  <div className="font-[var(--font-rajdhani)] text-xs tracking-widest uppercase text-[#D4A843] mb-3">
                    Upcoming Matches
                  </div>
                  <UpcomingSchedule onBattleSelect={() => {}} />
                </div>

                {/* Quick links */}
                <div className="bg-[#111] border border-[#1a1a1a] p-6">
                  <div className="font-[var(--font-rajdhani)] text-[10px] tracking-widest uppercase text-neutral-500 mb-4">
                    PATHS OF GLORY
                  </div>
                  <div className="space-y-2">
                    <a
                      href="/register"
                      className="block w-full text-center py-3 bg-[#0d0d0d] hover:bg-[#D4A843]/10 border border-[#1a1a1a] hover:border-[#D4A843]/50 font-[var(--font-rajdhani)] text-xs text-white tracking-widest uppercase transition-colors"
                    >
                      Forge New Champion
                    </a>
                    <a
                      href="/leaderboard"
                      className="block w-full text-center py-3 bg-[#0d0d0d] hover:bg-[#D4A843]/10 border border-[#1a1a1a] hover:border-[#D4A843]/50 font-[var(--font-rajdhani)] text-xs text-white tracking-widest uppercase transition-colors"
                    >
                      Hall of Champions
                    </a>
                  </div>
                </div>
              </aside>
            </motion.div>
          ) : (
            /* RAGNAROK MODE - Battle Royale */
            <motion.div
              key="ragnarok-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Selected Battle View */}
                {selectedBattleId ? (
                  <div>
                    <button
                      onClick={() => setSelectedBattleId(null)}
                      className="mb-4 font-mono text-xs text-neutral-500 hover:text-white transition-colors"
                    >
                      ← Back to Battles
                    </button>
                    <BattleRoyaleLive
                      battleId={selectedBattleId}
                      onBet={handleBattleBet}
                    />
                  </div>
                ) : (
                  <>
                    {/* Live Battles */}
                    {liveBattles.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white">
                            THE TWILIGHT RAGES
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {liveBattles.map((battle) => (
                            <BattleRoyaleCard
                              key={battle.id}
                              battle={battle}
                              onView={handleViewBattle}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Open Battles */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white flex items-center gap-2">
                          <Crown size={16} className="text-amber-500" />
                          BATTLES AWAITING WARRIORS
                        </h2>
                        <button
                          onClick={() => setShowCreateBattle(true)}
                          className="px-4 py-2 bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-[var(--font-orbitron)] text-xs tracking-wider rounded-sm hover:from-red-600 hover:via-red-500 hover:to-red-600 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                        >
                          <Plus size={14} />
                          SUMMON RAGNAROK
                        </button>
                      </div>

                      {openBattles.length === 0 ? (
                        <div className="bg-black/40 border border-neutral-800 rounded-lg p-8 text-center">
                          <Crown size={32} className="text-amber-500/50 mx-auto mb-4" />
                          <p className="font-[var(--font-rajdhani)] text-sm text-neutral-400">
                            No battles gather warriors. Summon one or await the scheduled twilight.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {openBattles.map((battle) => (
                            <BattleRoyaleCard
                              key={battle.id}
                              battle={battle}
                              onJoin={handleJoinBattle}
                              onView={handleViewBattle}
                            />
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Recent Completed */}
                    {completedBattles.length > 0 && (
                      <section>
                        <h2 className="font-[var(--font-orbitron)] text-sm tracking-[0.2em] text-white mb-4 flex items-center gap-2">
                          <Swords size={16} className="text-amber-500/70" />
                          FALLEN TWILIGHTS
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {completedBattles.map((battle) => (
                            <BattleRoyaleCard
                              key={battle.id}
                              battle={battle}
                              onView={handleViewBattle}
                              showActions={false}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
              </div>

              {/* Right Sidebar */}
              <aside className="space-y-6">
                {/* Matchmaking Queue */}
                {userAgent && (
                  <MatchmakingQueue
                    agentId={userAgent.id}
                    onMatched={(matchId) => toast.success('Match Found!', 'Joining battle...')}
                  />
                )}

                {/* Upcoming Schedule */}
                <UpcomingSchedule onBattleSelect={handleViewBattle} />

                {/* Quick Actions */}
                <div className="bg-black/40 border border-neutral-800 rounded-lg p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                  <h3 className="font-[var(--font-orbitron)] text-[10px] tracking-[0.2em] text-amber-500/70 mb-4">
                    PATHS OF GLORY
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowCreateBattle(true)}
                      className="block w-full text-center py-3 bg-amber-500/10 border border-amber-600/30 hover:border-amber-500 rounded-lg font-[var(--font-orbitron)] text-xs text-amber-500 transition-colors"
                    >
                      Summon Custom Battle
                    </button>
                    <a
                      href="/register"
                      className="block w-full text-center py-3 bg-black/40 hover:bg-amber-500/10 border border-neutral-800 hover:border-amber-500/50 rounded-lg font-[var(--font-orbitron)] text-xs text-white transition-colors"
                    >
                      Forge New Champion
                    </a>
                    <a
                      href="/leaderboard"
                      className="block w-full text-center py-3 bg-black/40 hover:bg-amber-500/10 border border-neutral-800 hover:border-amber-500/50 rounded-lg font-[var(--font-orbitron)] text-xs text-white transition-colors"
                    >
                      Hall of Champions
                    </a>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Battle Modal */}
      <AnimatePresence>
        {showCreateBattle && wallet.publicKey && (
          <CreateBattleRoyale
            walletAddress={wallet.publicKey.toString()}
            onCreated={(battleId) => {
              setShowCreateBattle(false);
              loadBattleRoyaleData();
              toast.success('Battle Created', 'Your battle is now open for registration!');
            }}
            onClose={() => setShowCreateBattle(false)}
          />
        )}
      </AnimatePresence>

      {/* Betting Modal (Ragnarok mode) */}
      <AnimatePresence>
        {showBettingModal && selectedBattleId && wallet.publicKey && (
          <BettingModal
            battleId={selectedBattleId}
            walletAddress={wallet.publicKey.toString()}
            preselectedAgentId={bettingAgentId}
            onClose={() => {
              setShowBettingModal(false);
              setBettingAgentId(undefined);
            }}
            onBetPlaced={() => toast.success('Bet Placed', 'Good luck!')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ArenaLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="text-amber-500 animate-spin mx-auto mb-4" />
        <p className="font-[var(--font-orbitron)] text-sm text-amber-500/70 tracking-wider">THE GATES OF BATTLE OPEN...</p>
      </div>
    </div>
  );
}

export default function ArenaPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<ArenaLoading />}>
        <ArenaContent />
      </Suspense>
    </ErrorBoundary>
  );
}
