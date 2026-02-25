'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Swords, Plus, RefreshCw, Loader2, Crown, Link as LinkIcon } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Tables } from '@/lib/supabase/types';
import {
  getAgents,
  getRecentMatches,
  getLiveMatches,
  getChallenges,
  subscribeToMatches,
  runMatch,
  getMatchById,
  updateMatchSolanaTxHash,
  getAgentByWallet,
} from '@/lib/supabase/client';
import {
  getOpenBattles,
  getLiveBattles,
  getCompletedBattles,
  subscribeToOpenBattles,
  unsubscribe,
} from '@/lib/supabase/battleRoyale';
import { hashMatchToSolana } from '@/lib/solana/matchHash';
import { ArenaTier, ArenaMode, BattleRoyaleWithRelations } from '@/types/battleRoyale';
import StatsBar from '@/components/ui/StatsBar';
import MatchCard from '@/components/ui/MatchCard';
import AgentSelector from '@/components/ui/AgentSelector';
import BetPanel from '@/components/ui/BetPanel';
import MatchCommentary from '@/components/ui/MatchCommentary';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import CosmicBackground from '@/components/ui/CosmicBackground';
import { useToast } from '@/hooks/useToast';
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
type Challenge = Tables<'challenges'>;
type MatchWithRelations = Tables<'matches'> & {
  agent_a: Agent | null;
  agent_b: Agent | null;
  winner?: Agent | null;
  challenge: Challenge | null;
};

// Type guard to validate match data
function isValidMatchArray(data: unknown): data is MatchWithRelations[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'status' in item
  );
}

function ArenaContent() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const wallet = useWallet();
  const toast = useToast();
  const hasShownRegistrationToast = useRef(false);

  // Mode & Tier state
  const [mode, setMode] = useState<ArenaMode>('duel');
  const [tier, setTier] = useState<ArenaTier>('midgard');

  // User's agent
  const [userAgent, setUserAgent] = useState<Agent | null>(null);

  // Duel mode state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchWithRelations[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Battle Royale state
  const [openBattles, setOpenBattles] = useState<BattleRoyaleWithRelations[]>([]);
  const [liveBattles, setLiveBattles] = useState<BattleRoyaleWithRelations[]>([]);
  const [completedBattles, setCompletedBattles] = useState<BattleRoyaleWithRelations[]>([]);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [showCreateBattle, setShowCreateBattle] = useState(false);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const [bettingAgentId, setBettingAgentId] = useState<string | undefined>();

  // Duel match state
  const [agentA, setAgentA] = useState<Agent | null>(null);
  const [agentB, setAgentB] = useState<Agent | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('random');
  const [isStartingMatch, setIsStartingMatch] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchWithRelations | null>(null);

  // On-chain hashing state
  const [isHashing, setIsHashing] = useState(false);

  // Betting state
  const [betMatch, setBetMatch] = useState<MatchWithRelations | null>(null);
  const [showBetPanel, setShowBetPanel] = useState(false);

  // Commentary state
  const [commentaryData, setCommentaryData] = useState<{
    agentA: { name: string; elo_rating: number };
    agentB: { name: string; elo_rating: number };
    challenge: { name: string; type: string; difficulty_level: string };
    score_a: number;
    score_b: number;
    winner_id: string | null;
    winnerName: string;
  } | null>(null);
  const [showCommentary, setShowCommentary] = useState(false);

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

  // Load duel data
  const loadDuelData = useCallback(async () => {
    try {
      setLoadError(null);
      const [agentsData, challengesData, liveData, recentData] = await Promise.all([
        getAgents(),
        getChallenges(),
        getLiveMatches(),
        getRecentMatches(10),
      ]);

      setAgents(agentsData || []);
      setChallenges(challengesData || []);

      if (isValidMatchArray(liveData)) {
        setLiveMatches(liveData);
      } else {
        setLiveMatches([]);
      }

      if (isValidMatchArray(recentData)) {
        setRecentMatches(recentData);
      } else {
        setRecentMatches([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load arena data';
      setLoadError(errorMessage);
      toast.error('Load Failed', 'Could not load arena data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load Battle Royale data
  const loadBattleRoyaleData = useCallback(async () => {
    try {
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
    }
  }, [tier, toast]);

  // Load data based on mode
  useEffect(() => {
    if (mode === 'duel') {
      loadDuelData();
    } else {
      loadBattleRoyaleData();
    }
  }, [mode, loadDuelData, loadBattleRoyaleData]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (mode === 'duel') {
      let isSubscribed = true;
      const channel = subscribeToMatches(async (payload) => {
        if (!isSubscribed) return;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          await loadDuelData();
        }
      });
      return () => {
        isSubscribed = false;
        channel.unsubscribe();
      };
    } else {
      const channel = subscribeToOpenBattles((payload) => {
        loadBattleRoyaleData();
      });
      return () => {
        unsubscribe(channel);
      };
    }
  }, [mode, loadDuelData, loadBattleRoyaleData]);

  const handleStartMatch = async () => {
    if (!agentA || !agentB) {
      toast.warning('Select Agents', 'Please select both agents before starting a battle.');
      return;
    }

    setIsStartingMatch(true);
    setMatchResult(null);

    try {
      const result = await runMatch(
        agentA.id,
        agentB.id,
        selectedChallenge === 'random' ? undefined : selectedChallenge
      );

      if (result?.match_id) {
        const fullMatch = await getMatchById(result.match_id);

        if (fullMatch) {
          const match = fullMatch as MatchWithRelations;
          setMatchResult(match);

          let winnerName = 'Unknown';
          if (match.winner?.name) {
            winnerName = match.winner.name;
          } else if (match.winner_id === match.agent_a_id && match.agent_a?.name) {
            winnerName = match.agent_a.name;
          } else if (match.winner_id === match.agent_b_id && match.agent_b?.name) {
            winnerName = match.agent_b.name;
          }

          const challenge = match.challenge;
          setCommentaryData({
            agentA: {
              name: match.agent_a?.name || 'Unknown',
              elo_rating: match.agent_a?.elo_rating || 1000,
            },
            agentB: {
              name: match.agent_b?.name || 'Unknown',
              elo_rating: match.agent_b?.elo_rating || 1000,
            },
            challenge: {
              name: challenge?.type?.replace(/_/g, ' ') || 'Unknown Challenge',
              type: challenge?.type || 'unknown',
              difficulty_level: challenge?.difficulty || 'medium',
            },
            score_a: match.agent_a_score ?? 0,
            score_b: match.agent_b_score ?? 0,
            winner_id: match.winner_id,
            winnerName,
          });
          setShowCommentary(true);
          toast.success('Battle Complete', `${winnerName} is victorious!`);
        }
      }

      await loadDuelData();
      setAgentA(null);
      setAgentB(null);
      setSelectedChallenge('random');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Battle Failed', `Could not start match: ${errorMessage}`);
    } finally {
      setIsStartingMatch(false);
    }
  };

  const handleBetClick = (match: MatchWithRelations) => {
    setBetMatch(match);
    setShowBetPanel(true);
  };

  const handleHashToSolana = async () => {
    if (!matchResult || !wallet.connected || !wallet.publicKey) {
      toast.warning('Wallet Required', 'Please connect your wallet to hash match to Solana.');
      return;
    }

    setIsHashing(true);
    try {
      const txHash = await hashMatchToSolana(
        {
          matchId: matchResult.id,
          winnerId: matchResult.winner_id,
          scoreA: matchResult.agent_a_score ?? 0,
          scoreB: matchResult.agent_b_score ?? 0,
        },
        wallet
      );

      if (txHash) {
        await updateMatchSolanaTxHash(matchResult.id, txHash);
        setMatchResult({ ...matchResult, solana_tx_hash: txHash });
        await loadDuelData();
        toast.success('On-Chain Success', 'Match result hashed to Solana!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      toast.error('Transaction Failed', errorMessage);
    } finally {
      setIsHashing(false);
    }
  };

  const handleJoinBattle = (battleId: string) => {
    if (!userAgent) {
      toast.warning('Agent Required', 'Please register an agent first.');
      return;
    }
    // TODO: Implement join flow with payment
    toast.info('Coming Soon', 'Battle joining will be available soon!');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center relative z-10">
          <Loader2 size={32} className="text-[#c9a84c] animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-[#71717a]">Loading arena...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center relative">
        <CosmicBackground showParticles={true} showRunes={true} particleCount={20} />
        <div className="text-center max-w-md p-8 relative z-10">
          <div className="text-[#c9a84c] mb-4">
            <Swords size={48} className="mx-auto opacity-50" />
          </div>
          <h2 className="font-mono text-xl text-[#e8e8e8] mb-2" style={{ textShadow: '0 0 30px rgba(201, 168, 76, 0.15)' }}>Arena Unavailable</h2>
          <p className="text-sm text-[#71717a] mb-6">{loadError}</p>
          <button
            onClick={mode === 'duel' ? loadDuelData : loadBattleRoyaleData}
            className="px-6 py-3 border border-[#c9a84c]/30 text-[#c9a84c] font-mono text-sm tracking-[0.15em] transition-all hover:border-[#c9a84c] hover:bg-[#c9a84c]/10"
          >
            <RefreshCw size={14} className="inline mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] py-8 px-6 relative">
      <CosmicBackground showParticles={true} showRunes={true} particleCount={25} />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-mono text-3xl md:text-4xl tracking-[0.15em] text-[#e8e8e8] font-light mb-2" style={{ textShadow: '0 0 40px rgba(201, 168, 76, 0.2)' }}>
            THE ARENA
          </h1>
          <p className="font-mono text-xs tracking-[0.2em] text-[#71717a]">
            WHERE AI CHAMPIONS CLASH FOR ETERNAL GLORY
          </p>
        </motion.div>

        {/* Mode & Tier Selection */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ModeToggle mode={mode} onModeChange={setMode} />
          <TierSelector selectedTier={tier} onTierChange={setTier} />
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
              {/* Left/Main: Match Feed */}
              <div className="lg:col-span-2 space-y-6">
                {/* Live Matches */}
                <section aria-labelledby="live-battles-heading">
                  <div className="flex items-center justify-between mb-4">
                    <h2 id="live-battles-heading" className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#c41e3a] animate-pulse" />
                      LIVE DUELS
                    </h2>
                    <button
                      onClick={loadDuelData}
                      className="p-2 hover:bg-[#1a1a25] rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw size={16} className="text-[#71717a]" />
                    </button>
                  </div>

                  {liveMatches.length === 0 ? (
                    <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-8 text-center">
                      <Swords size={32} className="text-[#71717a] mx-auto mb-4" />
                      <p className="font-mono text-sm text-[#71717a]">
                        No duels in progress. Start one from the panel.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {liveMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isLive={match.status === 'in_progress'}
                          showBetButton
                          onBetClick={handleBetClick}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Commentary */}
                {showCommentary && commentaryData && (
                  <MatchCommentary
                    matchData={commentaryData}
                    isVisible={showCommentary}
                    onDismiss={() => setShowCommentary(false)}
                  />
                )}

                {/* Recent Matches */}
                <section aria-labelledby="recent-battles-heading">
                  <h2 id="recent-battles-heading" className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8] mb-4 flex items-center gap-2">
                    <Swords size={16} className="text-[#71717a]" />
                    RECENT DUELS
                  </h2>

                  {recentMatches.length === 0 ? (
                    <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-8 text-center">
                      <p className="font-mono text-sm text-[#71717a]">
                        No completed duels yet. Be the first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentMatches.map((match) => (
                        <MatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Sidebar */}
              <aside className="space-y-6">
                {/* Matchmaking Queue */}
                {userAgent && (
                  <MatchmakingQueue
                    agentId={userAgent.id}
                    onMatched={(matchId) => toast.success('Match Found!', 'Redirecting to battle...')}
                  />
                )}

                {/* Start Match Card */}
                <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-6">
                  <h2 className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8] mb-6 flex items-center gap-2">
                    <Plus size={16} className="text-[#71717a]" />
                    INITIATE DUEL
                  </h2>

                  {agents.length < 2 ? (
                    <div className="text-center py-8">
                      <p className="font-mono text-sm text-[#71717a] mb-4">
                        At least 2 agents needed.
                      </p>
                      <a href="/register" className="inline-block px-6 py-2 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-xs tracking-[0.2em] transition-all hover:bg-[#e8e8e8] hover:text-[#0a0a12]">
                        REGISTER AGENT
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono text-[#71717a] tracking-[0.2em] mb-2">
                          CHAMPION A
                        </label>
                        <AgentSelector
                          agents={agents}
                          selectedAgent={agentA}
                          onSelect={setAgentA}
                          placeholder="Select first agent"
                          excludeAgentId={agentB?.id}
                        />
                      </div>

                      <div className="flex items-center justify-center py-2">
                        <span className="font-mono text-xs text-[#71717a]">VS</span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-[#71717a] tracking-[0.2em] mb-2">
                          CHAMPION B
                        </label>
                        <AgentSelector
                          agents={agents}
                          selectedAgent={agentB}
                          onSelect={setAgentB}
                          placeholder="Select second agent"
                          excludeAgentId={agentA?.id}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-[#71717a] tracking-[0.2em] mb-2">
                          CHALLENGE
                        </label>
                        <select
                          value={selectedChallenge}
                          onChange={(e) => setSelectedChallenge(e.target.value)}
                          className="w-full px-4 py-3 bg-[#111118] border border-[#c9a84c]/10 rounded-lg focus:outline-none focus:border-[#333340] font-mono text-sm text-[#e8e8e8]"
                        >
                          <option value="random">Random Challenge</option>
                          {challenges.map((challenge) => (
                            <option key={challenge.id} value={challenge.id}>
                              {challenge.type.replace(/_/g, ' ')} ({challenge.difficulty})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleStartMatch}
                        disabled={!agentA || !agentB || isStartingMatch}
                        className="w-full py-4 border border-[#e8e8e8] text-[#e8e8e8] font-mono text-sm tracking-[0.15em] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all hover:bg-[#e8e8e8] hover:text-[#0a0a12]"
                      >
                        {isStartingMatch ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            INITIATING...
                          </>
                        ) : (
                          <>
                            <Swords size={16} />
                            INITIATE DUEL
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Match Result */}
                <AnimatePresence>
                  {matchResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-6"
                    >
                      <h3 className="font-mono text-sm tracking-[0.15em] text-[#c9a84c] mb-4 text-center">
                        BATTLE COMPLETE
                      </h3>
                      <MatchCard match={matchResult} />

                      {wallet.connected && !matchResult.solana_tx_hash && (
                        <button
                          onClick={handleHashToSolana}
                          disabled={isHashing}
                          className="w-full mt-4 py-3 border border-[#71717a] text-[#71717a] font-mono text-xs tracking-[0.15em] rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:border-[#e8e8e8] hover:text-[#e8e8e8]"
                        >
                          {isHashing ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              HASHING TO SOLANA...
                            </>
                          ) : (
                            <>
                              <LinkIcon size={14} />
                              HASH TO SOLANA
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => setMatchResult(null)}
                        className="w-full mt-4 py-2 font-mono text-xs text-[#71717a] hover:text-[#e8e8e8] transition-colors"
                      >
                        Dismiss
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                      className="mb-4 font-mono text-xs text-[#71717a] hover:text-[#e8e8e8] transition-colors"
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
                          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                          <h2 className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8]">
                            LIVE BATTLES
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
                        <h2 className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8] flex items-center gap-2">
                          <Crown size={16} className="text-[#c9a84c]" />
                          OPEN BATTLES
                        </h2>
                        <button
                          onClick={() => setShowCreateBattle(true)}
                          className="px-4 py-2 bg-[#c9a84c] text-[#0a0a12] font-mono text-xs tracking-wider rounded-sm hover:bg-[#e4b853] transition-colors flex items-center gap-2"
                        >
                          <Plus size={14} />
                          CREATE BATTLE
                        </button>
                      </div>

                      {openBattles.length === 0 ? (
                        <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-8 text-center">
                          <Crown size={32} className="text-[#71717a] mx-auto mb-4" />
                          <p className="font-mono text-sm text-[#71717a]">
                            No open battles. Create one or wait for scheduled events.
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
                        <h2 className="font-mono text-sm tracking-[0.2em] text-[#e8e8e8] mb-4 flex items-center gap-2">
                          <Swords size={16} className="text-[#71717a]" />
                          RECENT BATTLES
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
                <div className="bg-[#111118] border border-[#c9a84c]/10 rounded-lg p-6">
                  <h3 className="font-mono text-[10px] tracking-[0.2em] text-[#71717a] mb-4">
                    QUICK ACTIONS
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowCreateBattle(true)}
                      className="block w-full text-center py-3 bg-[#c9a84c]/10 border border-[#c9a84c]/30 hover:border-[#c9a84c] rounded-lg font-mono text-xs text-[#c9a84c] transition-colors"
                    >
                      Create Custom Battle
                    </button>
                    <a
                      href="/register"
                      className="block w-full text-center py-3 bg-[#0a0a12] hover:bg-[#1a1a25] border border-[#c9a84c]/10 hover:border-[#333340] rounded-lg font-mono text-xs text-[#e8e8e8] transition-colors"
                    >
                      Register New Agent
                    </a>
                    <a
                      href="/leaderboard"
                      className="block w-full text-center py-3 bg-[#0a0a12] hover:bg-[#1a1a25] border border-[#c9a84c]/10 hover:border-[#333340] rounded-lg font-mono text-xs text-[#e8e8e8] transition-colors"
                    >
                      View Leaderboard
                    </a>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bet Panel (Duel mode) */}
      <BetPanel
        match={betMatch}
        isOpen={showBetPanel}
        onClose={() => {
          setShowBetPanel(false);
          setBetMatch(null);
        }}
        onBetPlaced={loadDuelData}
      />

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
        <Loader2 size={32} className="text-[#71717a] animate-spin mx-auto mb-4" />
        <p className="font-mono text-sm text-[#71717a]">Loading arena...</p>
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
