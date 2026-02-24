/**
 * Battle Royale & Volume Engine Database Helpers
 * Phase 5: Ragnarok Volume Engine
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';
import {
  ArenaTier,
  BattleRoyale,
  BattleRoyaleWithRelations,
  BattleRoyaleParticipant,
  BattleRoyaleRound,
  BattleRoyaleBet,
  BattleRoyaleStatus,
  BattleOrigin,
  PayoutType,
  QueueEntry,
  QueueStats,
  Season,
  SeasonStanding,
  ScheduledEvent,
} from '@/types/battleRoyale';

// ============================================================================
// Battle Royale Operations
// ============================================================================

/**
 * Get all open battles (accepting registrations)
 */
export async function getOpenBattles(tier?: ArenaTier): Promise<BattleRoyaleWithRelations[]> {
  let query = supabase
    .from('battle_royales')
    .select(`
      *,
      winner:agents!battle_royales_winner_id_fkey(id, name, elo_rating, avatar_url),
      second_place:agents!battle_royales_second_place_id_fkey(id, name, elo_rating, avatar_url),
      third_place:agents!battle_royales_third_place_id_fkey(id, name, elo_rating, avatar_url),
      participants:battle_royale_participants(
        *,
        agent:agents(id, name, elo_rating, avatar_url)
      )
    `)
    .eq('status', 'open')
    .gt('registration_closes_at', new Date().toISOString())
    .order('registration_closes_at', { ascending: true });

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as BattleRoyaleWithRelations[];
}

/**
 * Get battles by status
 */
export async function getBattlesByStatus(
  status: BattleRoyaleStatus,
  tier?: ArenaTier,
  limit: number = 20
): Promise<BattleRoyaleWithRelations[]> {
  let query = supabase
    .from('battle_royales')
    .select(`
      *,
      winner:agents!battle_royales_winner_id_fkey(id, name, elo_rating, avatar_url),
      second_place:agents!battle_royales_second_place_id_fkey(id, name, elo_rating, avatar_url),
      third_place:agents!battle_royales_third_place_id_fkey(id, name, elo_rating, avatar_url),
      participants:battle_royale_participants(
        *,
        agent:agents(id, name, elo_rating, avatar_url)
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as BattleRoyaleWithRelations[];
}

/**
 * Get a single battle by ID with all relations
 */
export async function getBattleById(battleId: string): Promise<BattleRoyaleWithRelations | null> {
  const { data, error } = await supabase
    .from('battle_royales')
    .select(`
      *,
      winner:agents!battle_royales_winner_id_fkey(id, name, elo_rating, avatar_url),
      second_place:agents!battle_royales_second_place_id_fkey(id, name, elo_rating, avatar_url),
      third_place:agents!battle_royales_third_place_id_fkey(id, name, elo_rating, avatar_url),
      participants:battle_royale_participants(
        *,
        agent:agents(id, name, elo_rating, avatar_url)
      )
    `)
    .eq('id', battleId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown) as BattleRoyaleWithRelations | null;
}

/**
 * Get live battles (currently in progress)
 */
export async function getLiveBattles(tier?: ArenaTier): Promise<BattleRoyaleWithRelations[]> {
  let query = supabase
    .from('battle_royales')
    .select(`
      *,
      winner:agents!battle_royales_winner_id_fkey(id, name, elo_rating, avatar_url),
      second_place:agents!battle_royales_second_place_id_fkey(id, name, elo_rating, avatar_url),
      third_place:agents!battle_royales_third_place_id_fkey(id, name, elo_rating, avatar_url),
      participants:battle_royale_participants(
        *,
        agent:agents(id, name, elo_rating, avatar_url)
      )
    `)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false });

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as BattleRoyaleWithRelations[];
}

/**
 * Get upcoming scheduled battles
 */
export async function getUpcomingBattles(
  tier?: ArenaTier,
  limit: number = 10
): Promise<BattleRoyale[]> {
  let query = supabase
    .from('battle_royales')
    .select('*')
    .eq('status', 'open')
    .eq('origin', 'scheduled')
    .gt('registration_closes_at', new Date().toISOString())
    .order('registration_closes_at', { ascending: true })
    .limit(limit);

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as BattleRoyale[];
}

/**
 * Get completed battles (for history)
 */
export async function getCompletedBattles(
  tier?: ArenaTier,
  limit: number = 20
): Promise<BattleRoyaleWithRelations[]> {
  let query = supabase
    .from('battle_royales')
    .select(`
      *,
      winner:agents!battle_royales_winner_id_fkey(id, name, elo_rating, avatar_url),
      second_place:agents!battle_royales_second_place_id_fkey(id, name, elo_rating, avatar_url),
      third_place:agents!battle_royales_third_place_id_fkey(id, name, elo_rating, avatar_url)
    `)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as BattleRoyaleWithRelations[];
}

// ============================================================================
// Battle Royale Participation
// ============================================================================

/**
 * Join a battle royale (via Edge Function for transaction handling)
 */
export async function joinBattle(
  battleId: string,
  agentId: string,
  walletAddress: string
): Promise<{ success: boolean; participant_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('battle-royale-join', {
    body: {
      battle_id: battleId,
      agent_id: agentId,
      wallet_address: walletAddress,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}

/**
 * Get participants for a battle
 */
export async function getBattleParticipants(
  battleId: string
): Promise<BattleRoyaleParticipant[]> {
  const { data, error } = await supabase
    .from('battle_royale_participants')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('battle_id', battleId)
    .order('total_score', { ascending: false });

  if (error) throw error;
  return (data as unknown) as BattleRoyaleParticipant[];
}

/**
 * Check if an agent is already registered for a battle
 */
export async function isAgentInBattle(
  battleId: string,
  agentId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('battle_royale_participants')
    .select('id')
    .eq('battle_id', battleId)
    .eq('agent_id', agentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// ============================================================================
// Battle Royale Creation & Management
// ============================================================================

interface CreateBattleParams {
  name?: string;
  tier: ArenaTier;
  buyInSol: number;
  maxAgents?: number | null;
  numRounds?: number;
  payoutStructure?: PayoutType;
  registrationMinutes?: number;
  walletAddress: string;
}

/**
 * Create a custom battle royale (via Edge Function)
 */
export async function createBattle(
  params: CreateBattleParams
): Promise<{ success: boolean; battle_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('create-battle-royale', {
    body: {
      name: params.name,
      tier: params.tier,
      buy_in_sol: params.buyInSol,
      max_agents: params.maxAgents,
      num_rounds: params.numRounds || 3,
      payout_structure: params.payoutStructure || 'winner_takes_all',
      registration_minutes: params.registrationMinutes || 30,
      wallet_address: params.walletAddress,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}

/**
 * Start a battle royale (creator only, via Edge Function)
 */
export async function startBattle(
  battleId: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('start-battle-royale', {
    body: {
      battle_id: battleId,
      wallet_address: walletAddress,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}

// ============================================================================
// Battle Royale Rounds
// ============================================================================

/**
 * Get rounds for a battle
 */
export async function getBattleRounds(battleId: string): Promise<BattleRoyaleRound[]> {
  const { data, error } = await supabase
    .from('battle_royale_rounds')
    .select(`
      *,
      challenge:challenges(id, type, difficulty)
    `)
    .eq('battle_id', battleId)
    .order('round_number', { ascending: true });

  if (error) throw error;
  return (data as unknown) as BattleRoyaleRound[];
}

/**
 * Get current round for a live battle
 */
export async function getCurrentRound(battleId: string): Promise<BattleRoyaleRound | null> {
  const { data, error } = await supabase
    .from('battle_royale_rounds')
    .select(`
      *,
      challenge:challenges(id, type, difficulty)
    `)
    .eq('battle_id', battleId)
    .eq('status', 'in_progress')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown) as BattleRoyaleRound | null;
}

// ============================================================================
// Battle Royale Betting
// ============================================================================

/**
 * Place a bet on a battle royale participant
 */
export async function placeBattleBet(
  battleId: string,
  agentId: string,
  amountSol: number,
  walletAddress: string
): Promise<{ success: boolean; bet_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('place-battle-bet', {
    body: {
      battle_id: battleId,
      agent_id: agentId,
      amount_sol: amountSol,
      wallet_address: walletAddress,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}

/**
 * Get bets for a battle
 */
export async function getBattleBets(battleId: string): Promise<BattleRoyaleBet[]> {
  const { data, error } = await supabase
    .from('battle_royale_bets')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('battle_id', battleId)
    .order('placed_at', { ascending: false });

  if (error) throw error;
  return (data as unknown) as BattleRoyaleBet[];
}

/**
 * Get user's bets for a battle
 */
export async function getUserBattleBets(
  battleId: string,
  walletAddress: string
): Promise<BattleRoyaleBet[]> {
  const { data, error } = await supabase
    .from('battle_royale_bets')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('battle_id', battleId)
    .eq('wallet_address', walletAddress);

  if (error) throw error;
  return (data as unknown) as BattleRoyaleBet[];
}

// ============================================================================
// Matchmaking Queue Operations
// ============================================================================

/**
 * Join the matchmaking queue
 */
export async function joinQueue(
  agentId: string,
  tier: ArenaTier
): Promise<{ success: boolean; queue_id?: string; position?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke('queue-join', {
    body: {
      agent_id: agentId,
      tier: tier,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data;
}

/**
 * Leave the matchmaking queue
 */
export async function leaveQueue(queueId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('matchmaking_queue')
    .delete()
    .eq('id', queueId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Get queue status for all tiers
 */
export async function getQueueStats(): Promise<QueueStats[]> {
  const tiers: ArenaTier[] = ['bifrost', 'midgard', 'asgard'];
  const stats: QueueStats[] = [];

  for (const tier of tiers) {
    const { count, error } = await supabase
      .from('matchmaking_queue')
      .select('*', { count: 'exact', head: true })
      .eq('tier', tier)
      .eq('status', 'waiting');

    if (error) throw error;

    stats.push({
      tier,
      waiting_count: count || 0,
      estimated_wait_seconds: Math.max(30, (count || 0) * 15), // Rough estimate
    });
  }

  return stats;
}

/**
 * Get user's queue entry
 */
export async function getUserQueueEntry(agentId: string): Promise<QueueEntry | null> {
  const { data, error } = await supabase
    .from('matchmaking_queue')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('agent_id', agentId)
    .eq('status', 'waiting')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown) as QueueEntry | null;
}

/**
 * Get queue entries for a tier
 */
export async function getQueueByTier(tier: ArenaTier): Promise<QueueEntry[]> {
  const { data, error } = await supabase
    .from('matchmaking_queue')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('tier', tier)
    .eq('status', 'waiting')
    .order('queued_at', { ascending: true });

  if (error) throw error;
  return (data as unknown) as QueueEntry[];
}

// ============================================================================
// Season Operations
// ============================================================================

/**
 * Get the current active season
 */
export async function getCurrentSeason(): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown) as Season | null;
}

/**
 * Get all seasons
 */
export async function getSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('season_number', { ascending: false });

  if (error) throw error;
  return (data as unknown) as Season[];
}

/**
 * Get season standings
 */
export async function getSeasonStandings(
  seasonId: string,
  limit: number = 100
): Promise<SeasonStanding[]> {
  const { data, error } = await supabase
    .from('season_standings')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('season_id', seasonId)
    .order('final_rank', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data as unknown) as SeasonStanding[];
}

/**
 * Get an agent's season stats
 */
export async function getAgentSeasonStats(
  seasonId: string,
  agentId: string
): Promise<SeasonStanding | null> {
  const { data, error } = await supabase
    .from('season_standings')
    .select(`
      *,
      agent:agents(id, name, elo_rating, avatar_url)
    `)
    .eq('season_id', seasonId)
    .eq('agent_id', agentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as unknown) as SeasonStanding | null;
}

// ============================================================================
// Scheduled Events
// ============================================================================

/**
 * Get active scheduled events
 */
export async function getScheduledEvents(tier?: ArenaTier): Promise<ScheduledEvent[]> {
  let query = supabase
    .from('scheduled_events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (tier) {
    query = query.eq('tier', tier);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown) as ScheduledEvent[];
}

// ============================================================================
// Stats & Analytics
// ============================================================================

/**
 * Get battle royale stats for the landing page
 */
export async function getBattleRoyaleStats(): Promise<{
  totalBattles: number;
  activeBattles: number;
  totalPrizePool: number;
  totalParticipants: number;
}> {
  const [battlesResult, activeResult, poolResult, participantsResult] = await Promise.all([
    supabase
      .from('battle_royales')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('battle_royales')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress']),
    supabase
      .from('battle_royales')
      .select('total_pool_sol'),
    supabase
      .from('battle_royale_participants')
      .select('*', { count: 'exact', head: true }),
  ]);

  if (battlesResult.error) throw battlesResult.error;
  if (activeResult.error) throw activeResult.error;
  if (poolResult.error) throw poolResult.error;
  if (participantsResult.error) throw participantsResult.error;

  const totalPrizePool = poolResult.data?.reduce(
    (sum, b) => sum + (b.total_pool_sol || 0),
    0
  ) || 0;

  return {
    totalBattles: battlesResult.count || 0,
    activeBattles: activeResult.count || 0,
    totalPrizePool,
    totalParticipants: participantsResult.count || 0,
  };
}

/**
 * Get an agent's battle royale history
 */
export async function getAgentBattleHistory(
  agentId: string,
  limit: number = 20
): Promise<BattleRoyaleParticipant[]> {
  const { data, error } = await supabase
    .from('battle_royale_participants')
    .select(`
      *,
      battle:battle_royales(*)
    `)
    .eq('agent_id', agentId)
    .order('joined_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown) as BattleRoyaleParticipant[];
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to battle updates
 */
export function subscribeToBattle(
  battleId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BattleRoyale;
    old: BattleRoyale | null;
  }) => void
): RealtimeChannel {
  return supabase
    .channel(`battle-${battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_royales',
        filter: `id=eq.${battleId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as BattleRoyale,
          old: payload.old as BattleRoyale | null,
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to battle participants
 */
export function subscribeToBattleParticipants(
  battleId: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BattleRoyaleParticipant;
    old: BattleRoyaleParticipant | null;
  }) => void
): RealtimeChannel {
  return supabase
    .channel(`battle-participants-${battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_royale_participants',
        filter: `battle_id=eq.${battleId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as BattleRoyaleParticipant,
          old: payload.old as BattleRoyaleParticipant | null,
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to queue changes for a tier
 */
export function subscribeToQueue(
  tier: ArenaTier,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: QueueEntry;
    old: QueueEntry | null;
  }) => void
): RealtimeChannel {
  return supabase
    .channel(`queue-${tier}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matchmaking_queue',
        filter: `tier=eq.${tier}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as QueueEntry,
          old: payload.old as QueueEntry | null,
        });
      }
    )
    .subscribe();
}

/**
 * Subscribe to all open battles
 */
export function subscribeToOpenBattles(
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: BattleRoyale;
    old: BattleRoyale | null;
  }) => void
): RealtimeChannel {
  return supabase
    .channel('open-battles')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battle_royales',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as BattleRoyale,
          old: payload.old as BattleRoyale | null,
        });
      }
    )
    .subscribe();
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}
