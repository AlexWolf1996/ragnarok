/**
 * Battle Engine - Shared battle execution logic for Ragnarok
 *
 * This module contains the core battle execution logic used by both:
 * - /api/battles/quick (random battles)
 * - /api/battles/execute (manual agent selection)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  generateAgentResponse,
  judgeResponses,
  calculateEloChange,
} from '@/lib/groq/client';

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
}

// Create admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function getSupabaseAdmin(): SupabaseAdmin {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
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
 * @returns Battle result with scores, ELO changes, and responses
 */
export async function executeBattle(
  agentAId: string,
  agentBId: string,
  challengeId?: string
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
    // Get random challenge
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*');

    if (error || !challenges || challenges.length === 0) {
      throw new Error('No challenges available');
    }

    challenge = challenges[Math.floor(Math.random() * challenges.length)];
  }

  console.log(`[Battle] Challenge: ${challenge.name} (${challenge.type})`);

  // Create match record
  const { data: match, error: matchError } = await supabase
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

  if (matchError || !match) {
    console.error('[Battle] Failed to create match:', matchError);
    throw new Error('Failed to create match record');
  }

  console.log(`[Battle] Match created: ${match.id}`);

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
    responseA = await generateAgentResponse(agentA.name, agentA.system_prompt, promptText as string);

    if (!responseA || responseA.trim().length === 0) {
      throw new Error('Agent A returned empty response');
    }
    console.log(`[Battle] Agent A response received (${responseA.length} chars)`);
  } catch (errorA) {
    console.error(`[Battle] Agent A (${agentA.name}) Groq call failed:`, errorA);
    await markMatchFailed(supabase, match.id, `Agent A Groq call failed: ${errorA instanceof Error ? errorA.message : 'Unknown error'}`);
    throw new Error(`Agent A response generation failed: ${errorA instanceof Error ? errorA.message : 'Unknown error'}`);
  }

  try {
    console.log(`[Battle] Generating response for Agent B: ${agentB.name}`);
    responseB = await generateAgentResponse(agentB.name, agentB.system_prompt, promptText as string);

    if (!responseB || responseB.trim().length === 0) {
      throw new Error('Agent B returned empty response');
    }
    console.log(`[Battle] Agent B response received (${responseB.length} chars)`);
  } catch (errorB) {
    console.error(`[Battle] Agent B (${agentB.name}) Groq call failed:`, errorB);
    await markMatchFailed(supabase, match.id, `Agent B Groq call failed: ${errorB instanceof Error ? errorB.message : 'Unknown error'}`);
    throw new Error(`Agent B response generation failed: ${errorB instanceof Error ? errorB.message : 'Unknown error'}`);
  }

  // Judge the responses with error handling
  let judgeResult;
  try {
    console.log(`[Battle] Calling judge for scoring`);
    judgeResult = await judgeResponses(
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

    console.log(`[Battle] Judge result: A=${judgeResult.scoreA}, B=${judgeResult.scoreB}, Winner=${judgeResult.winnerId}`);
  } catch (judgeError) {
    console.error(`[Battle] Judge call failed:`, judgeError);
    await markMatchFailed(supabase, match.id, `Judge call failed: ${judgeError instanceof Error ? judgeError.message : 'Unknown error'}`);
    throw new Error(`Judge scoring failed: ${judgeError instanceof Error ? judgeError.message : 'Unknown error'}`);
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
    // Tie - higher rated agent wins (or random if equal)
    if (agentA.elo_rating >= agentB.elo_rating) {
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

  // Calculate ELO changes
  const { winnerDelta, loserDelta } = calculateEloChange(
    winnerAgent.elo_rating,
    loserAgent.elo_rating
  );

  const newWinnerElo = winnerAgent.elo_rating + winnerDelta;
  const newLoserElo = Math.max(100, loserAgent.elo_rating + loserDelta);

  // Update match with results
  const { error: updateMatchError } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_id: winnerId,
      agent_a_response: responseA,
      agent_b_response: responseB,
      agent_a_score: judgeResult.scoreA,
      agent_b_score: judgeResult.scoreB,
      judge_reasoning: judgeResult.reasoning,
      completed_at: new Date().toISOString(),
    })
    .eq('id', match.id);

  if (updateMatchError) {
    console.error('[Battle] Failed to update match:', updateMatchError);
  }

  // Update agent stats
  const [winnerUpdate, loserUpdate] = await Promise.all([
    supabase
      .from('agents')
      .update({
        elo_rating: newWinnerElo,
        wins: winnerAgent.wins + 1,
        matches_played: winnerAgent.matches_played + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', winnerAgent.id),
    supabase
      .from('agents')
      .update({
        elo_rating: newLoserElo,
        losses: loserAgent.losses + 1,
        matches_played: loserAgent.matches_played + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loserAgent.id),
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
    matchId: match.id,
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
  };
}
