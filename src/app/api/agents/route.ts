import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * GET /api/agents
 * List all agents with stats
 *
 * Query params:
 * - limit: number (default 50)
 * - orderBy: 'elo' | 'wins' | 'matches' | 'name' (default 'elo')
 * - order: 'asc' | 'desc' (default 'desc')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const orderBy = searchParams.get('orderBy') || 'elo';
    const order = searchParams.get('order') === 'asc' ? true : false;

    const supabase = getSupabase();

    // Map orderBy param to column name
    const columnMap: Record<string, string> = {
      elo: 'elo_rating',
      wins: 'wins',
      matches: 'matches_played',
      name: 'name',
    };

    const column = columnMap[orderBy] || 'elo_rating';

    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, name, avatar_url, elo_rating, wins, losses, matches_played, created_at')
      .order(column, { ascending: order })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      );
    }

    // Calculate win rate for each agent
    const agentsWithStats = (agents || []).map((agent, index) => ({
      ...agent,
      rank: index + 1,
      winRate: agent.matches_played > 0
        ? Math.round((agent.wins / agent.matches_played) * 100)
        : 0,
    }));

    return NextResponse.json({
      success: true,
      count: agentsWithStats.length,
      agents: agentsWithStats,
    });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
