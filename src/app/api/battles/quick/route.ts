import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

// Create admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/battles/quick
 *
 * Triggers a random battle between two random agents with a random challenge.
 * Useful for testing and demonstrations.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get all active agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, elo_rating')
      .order('elo_rating', { ascending: false });

    if (agentsError || !agents || agents.length < 2) {
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

    if (challengesError || !challenges || challenges.length === 0) {
      return NextResponse.json(
        {
          error: 'No challenges available',
          message: 'Seed some challenges first using the SQL provided.',
        },
        { status: 400 }
      );
    }

    const challenge = challenges[Math.floor(Math.random() * challenges.length)];

    // Call the execute endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const executeResponse = await fetch(`${baseUrl}/api/battles/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentAId: agentA.id,
        agentBId: agentB.id,
        challengeId: challenge.id,
      }),
    });

    if (!executeResponse.ok) {
      const errorData = await executeResponse.json();
      return NextResponse.json(
        {
          error: 'Battle execution failed',
          details: errorData,
        },
        { status: executeResponse.status }
      );
    }

    const battleResult = await executeResponse.json();

    return NextResponse.json({
      success: true,
      message: `Quick battle completed: ${battleResult.winner.name} vs ${battleResult.loser.name}`,
      ...battleResult,
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
export async function POST(request: Request) {
  try {
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

    if (agentsError || !agents || agents.length < 2) {
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

    if (challengesError || !challenges || challenges.length === 0) {
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

    // Call the execute endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000';

    const executeResponse = await fetch(`${baseUrl}/api/battles/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentAId: agentA.id,
        agentBId: agentB.id,
        challengeId: challenge.id,
      }),
    });

    if (!executeResponse.ok) {
      const errorData = await executeResponse.json();
      return NextResponse.json(
        {
          error: 'Battle execution failed',
          details: errorData,
        },
        { status: executeResponse.status }
      );
    }

    const battleResult = await executeResponse.json();

    return NextResponse.json({
      success: true,
      message: `Quick battle completed: ${battleResult.winner.name} vs ${battleResult.loser.name}`,
      filters: { challengeType, minElo },
      ...battleResult,
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
