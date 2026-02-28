/**
 * ELO-Based Matchmaking System
 *
 * Selects fair matchups based on ELO proximity, recency, and opponent variety.
 */

import { getSupabaseAdmin } from '@/lib/battles/engine';

const CATEGORIES = ['Strategy', 'Code', 'Reasoning', 'Creative', 'Knowledge'] as const;

export type MatchCategory = typeof CATEGORIES[number];

export interface MatchupResult {
  agentA: { id: string; name: string; elo_rating: number };
  agentB: { id: string; name: string; elo_rating: number };
  category: MatchCategory;
}

/**
 * Get K-factor based on number of battles played.
 * - <20 battles: K=40 (volatile, quick adjustment)
 * - 20-50: K=20 (moderate)
 * - 50+: K=10 (stable)
 */
export function getKFactor(battlesPlayed: number): number {
  if (battlesPlayed < 20) return 40;
  if (battlesPlayed <= 50) return 20;
  return 10;
}

/**
 * Select a matchup for the next battle.
 *
 * 1. Pick Agent A randomly, weighted toward agents with oldest last_battle_at
 * 2. Find opponents within ELO range: ±200 → ±300 → ±400 → any
 * 3. Exclude: Agent A itself + agents that fought A in last 3 matches
 * 4. Pick Agent B randomly from candidates
 * 5. Pick random category
 */
export async function selectMatchup(): Promise<MatchupResult> {
  const supabase = getSupabaseAdmin();

  // Get all active agents (with at least some basic info)
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, elo_rating, matches_played, updated_at')
    .order('updated_at', { ascending: true }); // Oldest update first

  if (error || !agents || agents.length < 2) {
    throw new Error('Not enough agents for matchmaking (need at least 2)');
  }

  // Pick Agent A: weighted toward agents who haven't fought recently
  // Use inverse-recency weighting
  const now = Date.now();
  const weights = agents.map((agent) => {
    const lastActivity = new Date(agent.updated_at).getTime();
    const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
    return Math.max(1, hoursSince); // At least weight of 1
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  let agentAIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      agentAIndex = i;
      break;
    }
  }
  const agentA = agents[agentAIndex];

  // Get Agent A's recent opponents (last 3 matches)
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('agent_a_id, agent_b_id')
    .or(`agent_a_id.eq.${agentA.id},agent_b_id.eq.${agentA.id}`)
    .order('created_at', { ascending: false })
    .limit(3);

  const recentOpponentIds = new Set<string>();
  for (const match of (recentMatches || [])) {
    if (match.agent_a_id === agentA.id) recentOpponentIds.add(match.agent_b_id);
    else recentOpponentIds.add(match.agent_a_id);
  }

  // Find opponents in expanding ELO ranges
  const eloBands = [200, 300, 400, Infinity];
  let candidates: typeof agents = [];

  for (const band of eloBands) {
    candidates = agents.filter((agent) => {
      if (agent.id === agentA.id) return false;
      if (recentOpponentIds.has(agent.id)) return false;
      if (band !== Infinity) {
        const eloDiff = Math.abs(agent.elo_rating - agentA.elo_rating);
        if (eloDiff > band) return false;
      }
      return true;
    });
    if (candidates.length > 0) break;
  }

  // If still no candidates (all were recent opponents), allow recent opponents
  if (candidates.length === 0) {
    candidates = agents.filter((agent) => agent.id !== agentA.id);
  }

  if (candidates.length === 0) {
    throw new Error('No valid opponents found for matchmaking');
  }

  // Pick Agent B randomly from candidates
  const agentB = candidates[Math.floor(Math.random() * candidates.length)];

  // Pick random category
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  return {
    agentA: { id: agentA.id, name: agentA.name, elo_rating: agentA.elo_rating },
    agentB: { id: agentB.id, name: agentB.name, elo_rating: agentB.elo_rating },
    category,
  };
}
