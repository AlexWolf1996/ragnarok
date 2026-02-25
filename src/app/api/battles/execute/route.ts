import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  generateAgentResponse,
  judgeResponses,
  calculateEloChange,
} from '@/lib/groq/client';

// Create admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

export interface BattleExecuteRequest {
  agentAId: string;
  agentBId: string;
  challengeId?: string; // Optional - will pick random if not provided
}

export interface BattleExecuteResponse {
  success: boolean;
  matchId: string;
  winner: {
    id: string;
    name: string;
    score: number;
    newElo: number;
    eloDelta: number;
  };
  loser: {
    id: string;
    name: string;
    score: number;
    newElo: number;
    eloDelta: number;
  };
  challenge: {
    id: string;
    name: string;
    type: string;
  };
  reasoning: string;
  responses: {
    agentA: string;
    agentB: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let matchId: string | null = null;
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;

  try {
    const body: BattleExecuteRequest = await request.json();
    const { agentAId, agentBId, challengeId } = body;

    // Validate input
    if (!agentAId || !agentBId) {
      return NextResponse.json(
        { error: 'Both agentAId and agentBId are required' },
        { status: 400 }
      );
    }

    if (agentAId === agentBId) {
      return NextResponse.json(
        { error: 'An agent cannot battle itself' },
        { status: 400 }
      );
    }

    supabase = getSupabaseAdmin();

    // Fetch both agents
    const [agentAResult, agentBResult] = await Promise.all([
      supabase.from('agents').select('*').eq('id', agentAId).single(),
      supabase.from('agents').select('*').eq('id', agentBId).single(),
    ]);

    if (agentAResult.error || !agentAResult.data) {
      return NextResponse.json(
        { error: `Agent A not found: ${agentAId}` },
        { status: 404 }
      );
    }

    if (agentBResult.error || !agentBResult.data) {
      return NextResponse.json(
        { error: `Agent B not found: ${agentBId}` },
        { status: 404 }
      );
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
        return NextResponse.json(
          { error: `Challenge not found: ${challengeId}` },
          { status: 404 }
        );
      }
      challenge = data;
    } else {
      // Get random challenge
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*');

      if (error || !challenges || challenges.length === 0) {
        return NextResponse.json(
          { error: 'No challenges available' },
          { status: 500 }
        );
      }

      challenge = challenges[Math.floor(Math.random() * challenges.length)];
    }

    console.log(`[Battle] Challenge selected: ${challenge.name} (${challenge.type})`);

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
      return NextResponse.json(
        { error: 'Failed to create match record' },
        { status: 500 }
      );
    }

    matchId = match.id;
    console.log(`[Battle] Match created: ${matchId}`);

    // Extract prompt text from challenge
    const promptText = typeof challenge.prompt === 'object'
      ? (challenge.prompt as Record<string, unknown>).question ||
        (challenge.prompt as Record<string, unknown>).prompt ||
        JSON.stringify(challenge.prompt)
      : String(challenge.prompt);

    // Generate responses from both agents with individual error handling
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
      await markMatchFailed(supabase, matchId, `Agent A Groq call failed: ${errorA instanceof Error ? errorA.message : 'Unknown error'}`);
      return NextResponse.json(
        {
          error: 'Battle failed',
          message: `Agent A response generation failed: ${errorA instanceof Error ? errorA.message : 'Unknown error'}`,
          matchId
        },
        { status: 500 }
      );
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
      await markMatchFailed(supabase, matchId, `Agent B Groq call failed: ${errorB instanceof Error ? errorB.message : 'Unknown error'}`);
      return NextResponse.json(
        {
          error: 'Battle failed',
          message: `Agent B response generation failed: ${errorB instanceof Error ? errorB.message : 'Unknown error'}`,
          matchId
        },
        { status: 500 }
      );
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
      await markMatchFailed(supabase, matchId, `Judge call failed: ${judgeError instanceof Error ? judgeError.message : 'Unknown error'}`);
      return NextResponse.json(
        {
          error: 'Battle failed',
          message: `Judge scoring failed: ${judgeError instanceof Error ? judgeError.message : 'Unknown error'}`,
          matchId
        },
        { status: 500 }
      );
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
    const newLoserElo = Math.max(100, loserAgent.elo_rating + loserDelta); // Min ELO of 100

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
      // Don't return error - match data is still valid, just update failed
    }

    // Update agent stats
    const [winnerUpdateResult, loserUpdateResult] = await Promise.all([
      // Update winner
      supabase
        .from('agents')
        .update({
          elo_rating: newWinnerElo,
          wins: winnerAgent.wins + 1,
          matches_played: winnerAgent.matches_played + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', winnerAgent.id),
      // Update loser
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

    if (winnerUpdateResult.error) {
      console.error('[Battle] Failed to update winner stats:', winnerUpdateResult.error);
    }
    if (loserUpdateResult.error) {
      console.error('[Battle] Failed to update loser stats:', loserUpdateResult.error);
    }

    const duration = Date.now() - startTime;
    console.log(`[Battle] Completed in ${duration}ms: ${winnerAgent.name} (${judgeResult.scoreA}) defeats ${loserAgent.name} (${judgeResult.scoreB})`);

    const response: BattleExecuteResponse = {
      success: true,
      matchId: match.id,
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
      },
      reasoning: judgeResult.reasoning,
      responses: {
        agentA: responseA,
        agentB: responseB,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Battle] Unexpected error:', error);

    // Mark match as failed if we have a match ID
    if (matchId && supabase) {
      await markMatchFailed(supabase, matchId, `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return NextResponse.json(
      {
        error: 'Battle execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        matchId,
      },
      { status: 500 }
    );
  }
}

/**
 * Mark a match as failed without updating ELO
 */
async function markMatchFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
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
