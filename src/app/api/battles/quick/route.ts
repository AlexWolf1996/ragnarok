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
    throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Execute a battle between two agents
 * Shared logic used by both quick and execute routes
 */
async function executeBattle(agentAId: string, agentBId: string, challengeId: string) {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();

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

  // Fetch challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    throw new Error(`Challenge not found: ${challengeId}`);
  }

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
    console.error('Failed to create match:', matchError);
    throw new Error('Failed to create match record');
  }

  try {
    // Extract prompt text from challenge
    const promptText = typeof challenge.prompt === 'object'
      ? (challenge.prompt as Record<string, unknown>).question ||
        (challenge.prompt as Record<string, unknown>).prompt ||
        JSON.stringify(challenge.prompt)
      : String(challenge.prompt);

    // Generate responses from both agents in parallel
    const [responseA, responseB] = await Promise.all([
      generateAgentResponse(agentA.name, agentA.system_prompt, promptText as string),
      generateAgentResponse(agentB.name, agentB.system_prompt, promptText as string),
    ]);

    // Judge the responses
    const judgeResult = await judgeResponses(
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
    await supabase
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

    // Update agent stats
    await Promise.all([
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

    const duration = Date.now() - startTime;
    console.log(`Battle completed in ${duration}ms: ${winnerAgent.name} defeats ${loserAgent.name}`);

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
        prompt: promptText,
      },
      reasoning: judgeResult.reasoning,
    };
  } catch (battleError) {
    // Mark match as failed
    await supabase
      .from('matches')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', match.id);

    throw battleError;
  }
}

/**
 * GET /api/battles/quick
 *
 * Triggers a random battle between two random agents with a random challenge.
 * Useful for testing and demonstrations.
 */
export async function GET() {
  try {
    // Check required env vars
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'GROQ_API_KEY environment variable is not set',
        },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get all active agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, elo_rating')
      .order('elo_rating', { ascending: false });

    if (agentsError) {
      console.error('Failed to fetch agents:', agentsError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: `Failed to fetch agents: ${agentsError.message}`,
        },
        { status: 500 }
      );
    }

    if (!agents || agents.length < 2) {
      return NextResponse.json(
        {
          error: 'Not enough agents for a battle',
          message: 'At least 2 agents are required. Register more agents first.',
          agentCount: agents?.length || 0,
        },
        { status: 400 }
      );
    }

    // Pick two random different agents
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    const agentA = shuffled[0];
    const agentB = shuffled[1];

    // Get a random challenge
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id, name, type');

    if (challengesError) {
      console.error('Failed to fetch challenges:', challengesError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: `Failed to fetch challenges: ${challengesError.message}`,
        },
        { status: 500 }
      );
    }

    if (!challenges || challenges.length === 0) {
      return NextResponse.json(
        {
          error: 'No challenges available',
          message: 'Seed some challenges first using the SQL provided.',
        },
        { status: 400 }
      );
    }

    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    // Execute the battle directly (no HTTP call)
    const battleResult = await executeBattle(agentA.id, agentB.id, challenge.id);

    return NextResponse.json({
      ...battleResult,
      message: `Quick battle completed: ${battleResult.winner.name} vs ${battleResult.loser.name}`,
    });
  } catch (error) {
    console.error('Quick battle error:', error);
    return NextResponse.json(
      {
        error: 'Quick battle failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/battles/quick
 *
 * Same as GET but allows specifying optional filters:
 * - challengeType: Only use challenges of this type
 * - minElo: Only include agents with ELO >= this value
 */
export async function POST(request: NextRequest) {
  try {
    // Check required env vars
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'GROQ_API_KEY environment variable is not set',
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { challengeType, minElo } = body;

    const supabase = getSupabaseAdmin();

    // Get agents (with optional ELO filter)
    let agentsQuery = supabase
      .from('agents')
      .select('id, name, elo_rating')
      .order('elo_rating', { ascending: false });

    if (minElo && typeof minElo === 'number') {
      agentsQuery = agentsQuery.gte('elo_rating', minElo);
    }

    const { data: agents, error: agentsError } = await agentsQuery;

    if (agentsError) {
      console.error('Failed to fetch agents:', agentsError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: `Failed to fetch agents: ${agentsError.message}`,
        },
        { status: 500 }
      );
    }

    if (!agents || agents.length < 2) {
      return NextResponse.json(
        {
          error: 'Not enough agents for a battle',
          message: minElo
            ? `Not enough agents with ELO >= ${minElo}`
            : 'At least 2 agents are required',
          agentCount: agents?.length || 0,
        },
        { status: 400 }
      );
    }

    // Pick two random different agents
    const shuffled = [...agents].sort(() => Math.random() - 0.5);
    const agentA = shuffled[0];
    const agentB = shuffled[1];

    // Get challenges (with optional type filter)
    let challengesQuery = supabase
      .from('challenges')
      .select('id, name, type');

    if (challengeType && typeof challengeType === 'string') {
      challengesQuery = challengesQuery.eq('type', challengeType);
    }

    const { data: challenges, error: challengesError } = await challengesQuery;

    if (challengesError) {
      console.error('Failed to fetch challenges:', challengesError);
      return NextResponse.json(
        {
          error: 'Database error',
          message: `Failed to fetch challenges: ${challengesError.message}`,
        },
        { status: 500 }
      );
    }

    if (!challenges || challenges.length === 0) {
      return NextResponse.json(
        {
          error: 'No challenges available',
          message: challengeType
            ? `No challenges of type "${challengeType}"`
            : 'Seed some challenges first',
        },
        { status: 400 }
      );
    }

    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    // Execute the battle directly (no HTTP call)
    const battleResult = await executeBattle(agentA.id, agentB.id, challenge.id);

    return NextResponse.json({
      ...battleResult,
      message: `Quick battle completed: ${battleResult.winner.name} vs ${battleResult.loser.name}`,
      filters: { challengeType, minElo },
    });
  } catch (error) {
    console.error('Quick battle error:', error);
    return NextResponse.json(
      {
        error: 'Quick battle failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
