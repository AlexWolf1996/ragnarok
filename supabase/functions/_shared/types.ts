/**
 * Shared types for Edge Functions
 */

export type ArenaTier = 'bifrost' | 'midgard' | 'asgard';
export type BattleRoyaleStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type PayoutType = 'winner_takes_all' | 'top_three';
export type BattleOrigin = 'scheduled' | 'custom';

export interface TierConfig {
  name: string;
  buyIn: number;
  minAgents: number;
  platformFeePct: number;
}

export const TIER_CONFIG: Record<ArenaTier, TierConfig> = {
  bifrost: {
    name: 'BIFROST',
    buyIn: 0.01,
    minAgents: 3,
    platformFeePct: 5,
  },
  midgard: {
    name: 'MIDGARD',
    buyIn: 0.1,
    minAgents: 4,
    platformFeePct: 5,
  },
  asgard: {
    name: 'ASGARD',
    buyIn: 1.0,
    minAgents: 4,
    platformFeePct: 5,
  },
};

export interface RoundScore {
  round: number;
  score: number;
  time_ms: number;
  challenge_type?: string;
}

export function calculatePayouts(
  totalPool: number,
  platformFeePct: number,
  payoutStructure: PayoutType
): { first: number; second: number; third: number; platformFee: number } {
  const platformFee = totalPool * (platformFeePct / 100);
  const netPool = totalPool - platformFee;

  if (payoutStructure === 'winner_takes_all') {
    return { first: netPool, second: 0, third: 0, platformFee };
  }

  // top_three: 60% / 25% / 15%
  return {
    first: netPool * 0.6,
    second: netPool * 0.25,
    third: netPool * 0.15,
    platformFee,
  };
}

export function generateBattleName(tier: ArenaTier): string {
  void tier;
  const adjectives = ['Epic', 'Fierce', 'Legendary', 'Brutal', 'Glorious', 'Savage'];
  const nouns = ['Clash', 'Showdown', 'Battle', 'Arena', 'Conquest', 'Ragnarok'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj} ${noun} #${num}`;
}
