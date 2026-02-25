/**
 * Quick Battle API - Random battles for testing and demonstrations
 *
 * GET /api/battles/quick - Random battle between two random agents
 * POST /api/battles/quick - Random battle with optional filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeBattle, getSupabaseAdmin } from '@/lib/battles/engine';

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
      console.error('[QuickBattle] Failed to fetch agents:', agentsError);
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
      console.error('[QuickBattle] Failed to fetch challenges:', challengesError);
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

    // Execute the battle using shared engine
    const battleResult = await executeBattle(agentA.id, agentB.id, challenge.id);

    return NextResponse.json({
      ...battleResult,
      message: `Quick battle completed: ${battleResult.winner.name} vs ${battleResult.loser.name}`,
    });
  } catch (error) {
    console.error('[QuickBattle] Error:', error);
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
      console.error('[QuickBattle] Failed to fetch agents:', agentsError);
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
      console.error('[QuickBattle] Failed to fetch challenges:', challengesError);
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

    // Execute the battle using shared engine
    const battleResult = await executeBattle(agentA.id, agentB.id, challenge.id);

    return NextResponse.json({
      ...battleResult,
      message: `Quick battle completed: ${battleResult.winner.name} vs ${battleResult.loser.name}`,
      filters: { challengeType, minElo },
    });
  } catch (error) {
    console.error('[QuickBattle] Error:', error);
    return NextResponse.json(
      {
        error: 'Quick battle failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
