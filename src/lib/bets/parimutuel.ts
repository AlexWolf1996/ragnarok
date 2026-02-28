/**
 * Parimutuel Odds System
 *
 * All bets pool together → 5% rake to treasury → 95% split proportionally to winners.
 * Example: 0.80 SOL on A, 0.20 SOL on B. If B wins: 0.95/0.20 = 4.75x
 */

import { getSupabaseAdmin } from '@/lib/battles/engine';

export interface ParimutuelOdds {
  poolA: number;
  poolB: number;
  totalPool: number;
  rake: number;
  prizePool: number;
  oddsA: number;
  oddsB: number;
  agentAId: string;
  agentBId: string;
}

const RAKE_PERCENTAGE = 0.05;

/**
 * Calculate current parimutuel odds for a match.
 */
export async function calculateParimutuelOdds(matchId: string): Promise<ParimutuelOdds> {
  const supabase = getSupabaseAdmin();

  // Get the match to know which agents are fighting
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('agent_a_id, agent_b_id')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    throw new Error(`Match ${matchId} not found`);
  }

  // Get all bets for this match
  const { data: bets, error: betsError } = await supabase
    .from('bets')
    .select('agent_id, amount_sol')
    .eq('match_id', matchId);

  if (betsError) {
    throw new Error(`Failed to fetch bets: ${betsError.message}`);
  }

  // Calculate pools
  let poolA = 0;
  let poolB = 0;

  for (const bet of (bets || [])) {
    if (bet.agent_id === match.agent_a_id) {
      poolA += Number(bet.amount_sol);
    } else if (bet.agent_id === match.agent_b_id) {
      poolB += Number(bet.amount_sol);
    }
  }

  const totalPool = poolA + poolB;
  const rake = totalPool * RAKE_PERCENTAGE;
  const prizePool = totalPool - rake;
  const oddsA = poolA > 0 ? prizePool / poolA : 0;
  const oddsB = poolB > 0 ? prizePool / poolB : 0;

  return {
    poolA,
    poolB,
    totalPool,
    rake,
    prizePool,
    oddsA,
    oddsB,
    agentAId: match.agent_a_id,
    agentBId: match.agent_b_id,
  };
}

/**
 * Settle a completed match: calculate payouts for all winning bettors
 * and insert them into the payout_queue.
 */
export async function settleMatch(matchId: string, winnerId: string): Promise<{
  totalPayouts: number;
  bettorsSettled: number;
  rakeCollected: number;
}> {
  const supabase = getSupabaseAdmin();
  const odds = await calculateParimutuelOdds(matchId);

  // Determine winning odds
  const winningOdds = winnerId === odds.agentAId ? odds.oddsA : odds.oddsB;

  // Get winning bets
  const { data: winningBets, error: betsError } = await supabase
    .from('bets')
    .select('*')
    .eq('match_id', matchId)
    .eq('agent_id', winnerId);

  if (betsError) {
    throw new Error(`Failed to fetch winning bets: ${betsError.message}`);
  }

  let totalPayouts = 0;
  let bettorsSettled = 0;

  for (const bet of (winningBets || [])) {
    const payoutAmount = Number(bet.amount_sol) * winningOdds;

    // Update bet with payout amount
    await supabase
      .from('bets')
      .update({
        payout_sol: payoutAmount,
        status: 'won',
      })
      .eq('id', bet.id);

    // Insert into payout queue
    await supabase
      .from('payout_queue')
      .insert({
        match_id: matchId,
        wallet_address: bet.wallet_address,
        amount_sol: payoutAmount,
      });

    totalPayouts += payoutAmount;
    bettorsSettled++;
  }

  // Mark losing bets
  const losingAgentId = winnerId === odds.agentAId ? odds.agentBId : odds.agentAId;
  await supabase
    .from('bets')
    .update({ status: 'lost' })
    .eq('match_id', matchId)
    .eq('agent_id', losingAgentId);

  return {
    totalPayouts,
    bettorsSettled,
    rakeCollected: odds.rake,
  };
}
