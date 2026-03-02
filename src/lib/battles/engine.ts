/**
 * Battle Engine - Shared battle execution logic for Ragnarok
 *
 * This module contains the core battle execution logic used by both:
 * - /api/battles/quick (random battles)
 * - /api/battles/execute (manual agent selection)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  multiJudge,
  calculateEloChange,
  JudgeVote,
} from '@/lib/groq/client';
import { getAgentResponse } from '@/lib/agents/responseProvider';
import { getKFactor } from '@/lib/matchmaking';

// Types
type SupabaseAdmin = SupabaseClient<Database>;

export interface BattleAgent {
  id: string;
  name: string;
  score: number;
  elo: number;
  newElo: number;
  eloDelta: number;
  isWinner: boolean;
  response: string;
}

export interface BattleWinner {
  id: string;
  name: string;
  score: number;
  newElo: number;
  eloDelta: number;
}

export interface BattleChallenge {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  prompt: string;
}

export interface BattleResult {
  success: boolean;
  matchId: string;
  agentA: BattleAgent;
  agentB: BattleAgent;
  winner: BattleWinner;
  loser: BattleWinner;
  challenge: BattleChallenge;
  reasoning: string;
  judges: JudgeVote[];
  isSplitDecision: boolean;
  isUnanimous: boolean;
}

// Create admin client for server-side operations
export function getSupabaseAdmin(): SupabaseAdmin {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Sanitize internal error messages before sending to the client.
 * Keeps server logs detailed but shows users a friendly message.
 */
function sanitizeBattleError(rawMessage: string): string {
  if (rawMessage.includes('429') || rawMessage.toLowerCase().includes('rate limit')) {
    return 'The arena is overloaded. Please try again in a minute.';
  }
  if (rawMessage.includes('500') || rawMessage.includes('502') || rawMessage.includes('503')) {
    return 'The judges are temporarily unavailable. Please try again shortly.';
  }
  if (rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('failed to fetch')) {
    return 'Network error reaching the judges. Please try again.';
  }
  if (rawMessage.toLowerCase().includes('timeout')) {
    return 'The battle took too long. Please try again.';
  }
  if (rawMessage.toLowerCase().includes('empty response')) {
    return 'An agent failed to respond. Please try again.';
  }
  return 'Battle execution failed. Please try again.';
}

/**
 * Mark a match as failed without updating ELO
 */
export async function markMatchFailed(
  supabase: SupabaseAdmin,
  matchId: string,
  reason: string
): Promise<void> {
  try {
    await supabase
      .from('matches')
      .update({
        status: 'failed',
        judge_reasoning: `BATTLE FAILED: ${reason}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId);
    console.log(`[Battle] Match ${matchId} marked as failed: ${reason}`);

    // Refund pending bets (dynamic import avoids circular dependency)
    try {
      const { refundMatch } = await import('@/lib/bets/parimutuel');
      await refundMatch(matchId);
    } catch (refundError) {
      console.error(`[Battle] Refund failed for match ${matchId} (match already marked failed):`, refundError);
    }
  } catch (updateError) {
    console.error(`[Battle] Failed to mark match as failed:`, updateError);
  }
}

/**
 * Execute a battle between two agents
 *
 * @param agentAId - ID of the first agent
 * @param agentBId - ID of the second agent
 * @param challengeId - Optional challenge ID (if not provided, picks random)
 * @param existingMatchId - Optional existing match ID (used by scheduler to avoid duplicate records)
 * @returns Battle result with scores, ELO changes, and responses
 */
export async function executeBattle(
  agentAId: string,
  agentBId: string,
  challengeId?: string,
  existingMatchId?: string,
): Promise<BattleResult> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();

  // Validate agents are different
  if (agentAId === agentBId) {
    throw new Error('An agent cannot battle itself');
  }

  // Fetch both agents
  const [agentAResult, agentBResult] = await Promise.all([
    supabase.from('agents').select('*').eq('id', agentAId).single(),
    supabase.from('agents').select('*').eq('id', agentBId).single(),
  ]);

  if (agentAResult.error || !agentAResult.data) {
    throw new Error(`Agent A not found: ${agentAId}`);
  }

  if (agentBResult.error || !agentBResult.data) {
    throw new Error(`Agent B not found: ${agentBId}`);
  }

  const agentA = agentAResult.data;
  const agentB = agentBResult.data;

  console.log(`[Battle] Starting: ${agentA.name} vs ${agentB.name}`);

  // Get challenge (random if not specified)
  let challenge;
  if (challengeId) {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error || !data) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }
    challenge = data;
  } else {
    // Get random challenge with balanced category distribution:
    // 1) Pick a random category, 2) Pick a random challenge within it
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*');

    if (error || !challenges || challenges.length === 0) {
      throw new Error('No challenges available');
    }

    const categories = [...new Set(challenges.map(c => c.type))];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryPool = challenges.filter(c => c.type === randomCategory);
    challenge = categoryPool[Math.floor(Math.random() * categoryPool.length)];
  }

  console.log(`[Battle] Challenge: ${challenge.name} (${challenge.type})`);

  // Use existing match (from scheduler) or create a new one (from /api/battles/* endpoints)
  let matchId: string;
  if (existingMatchId) {
    matchId = existingMatchId;
    console.log(`[Battle] Using existing match: ${matchId}`);
  } else {
    const { data: newMatch, error: matchError } = await supabase
      .from('matches')
      .insert({
        agent_a_id: agentAId,
        agent_b_id: agentBId,
        challenge_id: challenge.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (matchError || !newMatch) {
      console.error('[Battle] Failed to create match:', matchError);
      throw new Error('Failed to create match record');
    }
    matchId = newMatch.id;
    console.log(`[Battle] Match created: ${matchId}`);
  }

  // Extract prompt text from challenge
  const promptText = typeof challenge.prompt === 'object'
    ? (challenge.prompt as Record<string, unknown>).question ||
      (challenge.prompt as Record<string, unknown>).prompt ||
      JSON.stringify(challenge.prompt)
    : String(challenge.prompt);

  // Generate responses with individual error handling
  let responseA: string;
  let responseB: string;

  try {
    console.log(`[Battle] Generating response for Agent A: ${agentA.name}`);
    responseA = await getAgentResponse(agentA, promptText as string);

    if (!responseA || responseA.trim().length === 0) {
      throw new Error('Agent A returned empty response');
    }
    console.log(`[Battle] Agent A response received (${responseA.length} chars)`);
  } catch (errorA) {
    console.error(`[Battle] Agent A (${agentA.name}) Groq call failed:`, errorA);
    const rawMsg = errorA instanceof Error ? errorA.message : 'Unknown error';
    await markMatchFailed(supabase, matchId, `Agent A Groq call failed: ${rawMsg}`);
    throw new Error(sanitizeBattleError(rawMsg));
  }

  try {
    console.log(`[Battle] Generating response for Agent B: ${agentB.name}`);
    responseB = await getAgentResponse(agentB, promptText as string);

    if (!responseB || responseB.trim().length === 0) {
      throw new Error('Agent B returned empty response');
    }
    console.log(`[Battle] Agent B response received (${responseB.length} chars)`);
  } catch (errorB) {
    console.error(`[Battle] Agent B (${agentB.name}) Groq call failed:`, errorB);
    const rawMsg = errorB instanceof Error ? errorB.message : 'Unknown error';
    await markMatchFailed(supabase, matchId, `Agent B Groq call failed: ${rawMsg}`);
    throw new Error(sanitizeBattleError(rawMsg));
  }

  // Transition to judging state (both responses received, judges about to score)
  await supabase
    .from('matches')
    .update({
      status: 'judging',
      agent_a_response: responseA,
      agent_b_response: responseB,
    })
    .eq('id', matchId);

  console.log(`[Battle] Match ${matchId} → judging`);

  // Multi-judge panel — 3 independent LLMs score in parallel
  let judgeResult;
  try {
    console.log(`[Battle] Calling multi-judge panel (3 models)`);
    judgeResult = await multiJudge(
      {
        name: challenge.name,
        type: challenge.type,
        prompt: challenge.prompt,
        expectedOutput: challenge.expected_output,
      },
      agentA.name,
      responseA,
      agentB.name,
      responseB
    );

    // Validate judge result
    if (typeof judgeResult.scoreA !== 'number' || typeof judgeResult.scoreB !== 'number') {
      throw new Error(`Invalid judge scores: scoreA=${judgeResult.scoreA}, scoreB=${judgeResult.scoreB}`);
    }

    if (judgeResult.scoreA < 0 || judgeResult.scoreA > 100 || judgeResult.scoreB < 0 || judgeResult.scoreB > 100) {
      throw new Error(`Scores out of range: scoreA=${judgeResult.scoreA}, scoreB=${judgeResult.scoreB}`);
    }

    const validCount = judgeResult.judges.filter(j => !j.failed).length;
    const decision = judgeResult.isUnanimous ? 'UNANIMOUS' : judgeResult.isSplitDecision ? 'SPLIT' : 'MAJORITY';
    console.log(`[Battle] Multi-judge result: A=${judgeResult.scoreA}, B=${judgeResult.scoreB}, Winner=${judgeResult.winnerId} [${decision}, ${validCount}/3 judges]`);
  } catch (judgeError) {
    console.error(`[Battle] Multi-judge panel failed:`, judgeError);
    const rawMsg = judgeError instanceof Error ? judgeError.message : 'Unknown error';
    await markMatchFailed(supabase, matchId, `Judge panel failed: ${rawMsg}`);
    throw new Error(sanitizeBattleError(rawMsg));
  }

  // Determine winner
  let winnerId: string | null = null;
  let winnerAgent, loserAgent;
  let winnerScore: number, loserScore: number;

  if (judgeResult.winnerId === 'A') {
    winnerId = agentAId;
    winnerAgent = agentA;
    loserAgent = agentB;
    winnerScore = judgeResult.scoreA;
    loserScore = judgeResult.scoreB;
  } else if (judgeResult.winnerId === 'B') {
    winnerId = agentBId;
    winnerAgent = agentB;
    loserAgent = agentA;
    winnerScore = judgeResult.scoreB;
    loserScore = judgeResult.scoreA;
  } else {
    // Tie — random coin flip (no ELO bias)
    if (Math.random() < 0.5) {
      winnerId = agentAId;
      winnerAgent = agentA;
      loserAgent = agentB;
    } else {
      winnerId = agentBId;
      winnerAgent = agentB;
      loserAgent = agentA;
    }
    winnerScore = judgeResult.scoreA;
    loserScore = judgeResult.scoreB;
  }

  // Calculate ELO changes (K-factor scales by battle count)
  const winnerK = getKFactor(winnerAgent.matches_played);
  const loserK = getKFactor(loserAgent.matches_played);
  // Use average K for the match
  const kFactor = Math.round((winnerK + loserK) / 2);
  const { winnerDelta, loserDelta } = calculateEloChange(
    winnerAgent.elo_rating,
    loserAgent.elo_rating,
    kFactor
  );

  const newWinnerElo = winnerAgent.elo_rating + winnerDelta;
  const newLoserElo = Math.max(100, loserAgent.elo_rating + loserDelta);

  // Compute scores from judge votes (defensive — ensures non-null even if
  // multiJudge weighted average produces NaN in edge cases)
  const validVotes = judgeResult.judges.filter(j => !j.failed);
  const finalScoreA = validVotes.length > 0
    ? Math.round(validVotes.reduce((sum, j) => sum + j.scoreA, 0) / validVotes.length)
    : judgeResult.scoreA;
  const finalScoreB = validVotes.length > 0
    ? Math.round(validVotes.reduce((sum, j) => sum + j.scoreB, 0) / validVotes.length)
    : judgeResult.scoreB;

  // Guard against NaN — Supabase stores NaN as null
  const safeScoreA = Number.isFinite(finalScoreA) ? finalScoreA : 50;
  const safeScoreB = Number.isFinite(finalScoreB) ? finalScoreB : 50;

  // Update match with final results (responses already saved during judging transition)
  const { error: updateMatchError } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_id: winnerId,
      agent_a_score: safeScoreA,
      agent_b_score: safeScoreB,
      judge_reasoning: judgeResult.reasoning,
      judge_scores: JSON.parse(JSON.stringify(judgeResult.judges)) as Json,
      is_split_decision: judgeResult.isSplitDecision,
      is_unanimous: judgeResult.isUnanimous,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (updateMatchError) {
    console.error('[Battle] Failed to update match:', updateMatchError);
  }

  // Update agent stats atomically (SQL-level increments to prevent race conditions)
  const [winnerUpdate, loserUpdate] = await Promise.all([
    supabase.rpc('update_agent_battle_stats', {
      p_agent_id: winnerAgent.id,
      p_new_elo: newWinnerElo,
      p_is_winner: true,
    }),
    supabase.rpc('update_agent_battle_stats', {
      p_agent_id: loserAgent.id,
      p_new_elo: newLoserElo,
      p_is_winner: false,
    }),
  ]);

  if (winnerUpdate.error) {
    console.error('[Battle] Failed to update winner stats:', winnerUpdate.error);
  }
  if (loserUpdate.error) {
    console.error('[Battle] Failed to update loser stats:', loserUpdate.error);
  }

  const duration = Date.now() - startTime;
  console.log(`[Battle] Completed in ${duration}ms: ${winnerAgent.name} defeats ${loserAgent.name}`);

  return {
    success: true,
    matchId,
    agentA: {
      id: agentA.id,
      name: agentA.name,
      score: judgeResult.scoreA,
      elo: agentA.elo_rating,
      newElo: agentA.id === winnerAgent.id ? newWinnerElo : newLoserElo,
      eloDelta: agentA.id === winnerAgent.id ? winnerDelta : loserDelta,
      isWinner: agentA.id === winnerAgent.id,
      response: responseA,
    },
    agentB: {
      id: agentB.id,
      name: agentB.name,
      score: judgeResult.scoreB,
      elo: agentB.elo_rating,
      newElo: agentB.id === winnerAgent.id ? newWinnerElo : newLoserElo,
      eloDelta: agentB.id === winnerAgent.id ? winnerDelta : loserDelta,
      isWinner: agentB.id === winnerAgent.id,
      response: responseB,
    },
    winner: {
      id: winnerAgent.id,
      name: winnerAgent.name,
      score: winnerScore,
      newElo: newWinnerElo,
      eloDelta: winnerDelta,
    },
    loser: {
      id: loserAgent.id,
      name: loserAgent.name,
      score: loserScore,
      newElo: newLoserElo,
      eloDelta: loserDelta,
    },
    challenge: {
      id: challenge.id,
      name: challenge.name,
      type: challenge.type,
      difficulty: challenge.difficulty || 'midgard',
      prompt: promptText as string,
    },
    reasoning: judgeResult.reasoning,
    judges: judgeResult.judges,
    isSplitDecision: judgeResult.isSplitDecision,
    isUnanimous: judgeResult.isUnanimous,
  };
}
