/**
 * Battle Royale & Volume Engine Types
 * Phase 5: Ragnarok Volume Engine
 */

// ============================================================
// ARENA TIERS
// ============================================================

export type ArenaTier = 'bifrost' | 'midgard' | 'asgard';

export interface TierConfig {
  name: string;
  label: string;
  buyIn: number;
  minAgents: number;
  platformFeePct: number;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
}

export const TIER_CONFIG: Record<ArenaTier, TierConfig> = {
  bifrost: {
    name: 'BIFROST',
    label: 'Playground',
    buyIn: 0.01,
    minAgents: 3,
    platformFeePct: 5,
    color: '#4fc3f7',
    borderColor: 'border-[#4fc3f7]',
    bgColor: 'bg-[#4fc3f7]',
    description: 'Low stakes playground for testing and learning',
  },
  midgard: {
    name: 'MIDGARD',
    label: 'Standard',
    buyIn: 0.1,
    minAgents: 4,
    platformFeePct: 5,
    color: '#e8e8e8',
    borderColor: 'border-[#e8e8e8]',
    bgColor: 'bg-[#e8e8e8]',
    description: 'Standard competitive matches',
  },
  asgard: {
    name: 'ASGARD',
    label: 'Competitive',
    buyIn: 1.0,
    minAgents: 4,
    platformFeePct: 5,
    color: '#d4a843',
    borderColor: 'border-[#d4a843]',
    bgColor: 'bg-[#d4a843]',
    description: 'High stakes competitive arena',
  },
};

// ============================================================
// BATTLE ROYALE
// ============================================================

export type BattleRoyaleStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type PayoutType = 'winner_takes_all' | 'top_three';
export type BattleOrigin = 'scheduled' | 'custom';

export interface BattleRoyale {
  id: string;
  name: string;
  tier: ArenaTier;
  origin: BattleOrigin;
  min_agents: number;
  max_agents: number | null;
  buy_in_sol: number;
  payout_structure: PayoutType;
  platform_fee_pct: number;
  num_rounds: number;
  registration_closes_at: string;
  status: BattleRoyaleStatus;
  current_round: number;
  participant_count: number;
  winner_id: string | null;
  second_place_id: string | null;
  third_place_id: string | null;
  total_pool_sol: number;
  solana_tx_hash: string | null;
  created_by_wallet: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BattleRoyaleWithRelations extends BattleRoyale {
  winner?: AgentBasic | null;
  second_place?: AgentBasic | null;
  third_place?: AgentBasic | null;
  participants?: BattleRoyaleParticipant[];
}

export interface RoundScore {
  round: number;
  score: number;
  time_ms: number;
  challenge_type?: string;
}

export interface BattleRoyaleParticipant {
  id: string;
  battle_id: string;
  agent_id: string;
  round_scores: RoundScore[];
  total_score: number;
  final_rank: number | null;
  payout_sol: number;
  joined_at: string;
  agent?: AgentBasic;
}

export interface BattleRoyaleRound {
  id: string;
  battle_id: string;
  round_number: number;
  challenge_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  challenge?: {
    id: string;
    type: string;
    difficulty: string;
  };
}

export interface BattleRoyaleBet {
  id: string;
  battle_id: string;
  wallet_address: string;
  agent_id: string;
  amount_sol: number;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  payout_sol: number;
  placed_at: string;
  agent?: AgentBasic;
}

// ============================================================
// MATCHMAKING QUEUE
// ============================================================

export type QueueStatus = 'waiting' | 'matched' | 'expired';

export interface QueueEntry {
  id: string;
  agent_id: string;
  tier: ArenaTier;
  queued_at: string;
  status: QueueStatus;
  matched_with: string | null;
  match_id: string | null;
  agent?: AgentBasic;
}

export interface QueueStats {
  tier: ArenaTier;
  waiting_count: number;
  estimated_wait_seconds: number;
}

// ============================================================
// SEASONS
// ============================================================

export type SeasonStatus = 'upcoming' | 'active' | 'completed';

export interface Season {
  id: string;
  season_number: number;
  name: string;
  starts_at: string;
  ends_at: string;
  status: SeasonStatus;
  created_at: string;
}

export interface SeasonStanding {
  id: string;
  season_id: string;
  agent_id: string;
  final_elo: number;
  final_rank: number;
  total_matches: number;
  total_wins: number;
  total_earnings_sol: number;
  battle_royale_wins: number;
  agent?: AgentBasic;
}

// ============================================================
// SCHEDULED EVENTS
// ============================================================

export interface ScheduledEvent {
  id: string;
  name: string;
  tier: ArenaTier;
  cron_expression: string;
  buy_in_sol: number;
  min_agents: number;
  num_rounds: number;
  payout_structure: PayoutType;
  registration_window_minutes: number;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

// ============================================================
// AGENT TYPES (Extended)
// ============================================================

export interface AgentBasic {
  id: string;
  name: string;
  elo_rating: number;
  avatar_url: string | null;
}

export interface AgentWithTiers extends AgentBasic {
  registered_tiers: ArenaTier[];
  current_season_elo: number;
  current_season_wins: number;
  current_season_matches: number;
  wins: number;
  losses: number;
  matches_played: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface CreateBattleRoyaleRequest {
  action: 'create' | 'join' | 'start';
  // For create
  tier?: ArenaTier;
  buy_in_sol?: number;
  name?: string;
  max_agents?: number | null;
  num_rounds?: number;
  payout_structure?: PayoutType;
  registration_closes_at?: string;
  // For join
  battle_id?: string;
  agent_id?: string;
  // For start
  // battle_id (same as join)
}

export interface CreateBattleRoyaleResponse {
  success: boolean;
  battle_id?: string;
  message?: string;
  error?: string;
}

export interface JoinQueueRequest {
  agent_id: string;
  tier: ArenaTier;
}

export interface JoinQueueResponse {
  success: boolean;
  queue_id?: string;
  position?: number;
  estimated_wait_seconds?: number;
  error?: string;
}

export interface PlaceBattleBetRequest {
  battle_id: string;
  agent_id: string;
  amount_sol: number;
  wallet_address: string;
}

export interface PlaceBattleBetResponse {
  success: boolean;
  bet_id?: string;
  current_odds?: number;
  error?: string;
}

// ============================================================
// UI STATE TYPES
// ============================================================

export type ArenaMode = 'duel' | 'ragnarok';

export interface ArenaFilters {
  tier: ArenaTier;
  mode: ArenaMode;
}

export interface BattleRoyaleFilters {
  status?: BattleRoyaleStatus;
  origin?: BattleOrigin;
  tier?: ArenaTier;
}

// ============================================================
// PAYOUT CALCULATIONS
// ============================================================

export interface PayoutPreview {
  participantCount: number;
  totalPool: number;
  platformFee: number;
  netPool: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
}

export function calculatePayoutPreview(
  buyIn: number,
  participantCount: number,
  platformFeePct: number,
  payoutStructure: PayoutType
): PayoutPreview {
  const totalPool = buyIn * participantCount;
  const platformFee = totalPool * (platformFeePct / 100);
  const netPool = totalPool - platformFee;

  let firstPlace = 0;
  let secondPlace = 0;
  let thirdPlace = 0;

  if (payoutStructure === 'winner_takes_all') {
    firstPlace = netPool;
  } else {
    // top_three: 60% / 25% / 15%
    firstPlace = netPool * 0.6;
    secondPlace = netPool * 0.25;
    thirdPlace = netPool * 0.15;
  }

  return {
    participantCount,
    totalPool,
    platformFee,
    netPool,
    firstPlace,
    secondPlace,
    thirdPlace,
  };
}

// ============================================================
// BETTING ODDS CALCULATION
// ============================================================

export interface BettingOdds {
  agentId: string;
  totalBets: number;
  betCount: number;
  impliedOdds: number; // e.g., 2.5 means 2.5x payout
}

export function calculateBettingOdds(
  bets: BattleRoyaleBet[],
  participants: BattleRoyaleParticipant[]
): BettingOdds[] {
  const totalPool = bets.reduce((sum, bet) => sum + bet.amount_sol, 0);
  const betsByAgent = new Map<string, { total: number; count: number }>();

  // Initialize with all participants
  for (const p of participants) {
    betsByAgent.set(p.agent_id, { total: 0, count: 0 });
  }

  // Sum bets per agent
  for (const bet of bets) {
    const current = betsByAgent.get(bet.agent_id) || { total: 0, count: 0 };
    betsByAgent.set(bet.agent_id, {
      total: current.total + bet.amount_sol,
      count: current.count + 1,
    });
  }

  // Calculate odds
  const odds: BettingOdds[] = [];
  for (const [agentId, data] of betsByAgent) {
    // Implied odds: if no bets on agent, give generous odds
    // Otherwise: totalPool / betsOnAgent (capped at reasonable max)
    let impliedOdds = data.total > 0 ? totalPool / data.total : 10;
    impliedOdds = Math.min(impliedOdds, 50); // Cap at 50x
    impliedOdds = Math.max(impliedOdds, 1.1); // Min 1.1x

    odds.push({
      agentId,
      totalBets: data.total,
      betCount: data.count,
      impliedOdds: Math.round(impliedOdds * 100) / 100,
    });
  }

  return odds;
}

// ============================================================
// TIME HELPERS
// ============================================================

export function formatTimeRemaining(targetDate: string | Date): string {
  const target = new Date(targetDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'NOW';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function isRegistrationOpen(battle: BattleRoyale): boolean {
  if (battle.status !== 'open') return false;
  const closes = new Date(battle.registration_closes_at);
  return new Date() < closes;
}
