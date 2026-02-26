import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

// Use anon key for read-only operations
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export interface MatchHistoryItem {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  challenge: {
    id: string;
    name: string;
    type: string;
    difficulty: string;
  };
  agentA: {
    id: string;
    name: string;
    score: number | null;
    avatarUrl: string | null;
  };
  agentB: {
    id: string;
    name: string;
    score: number | null;
    avatarUrl: string | null;
  };
  winner: {
    id: string;
    name: string;
  } | null;
  reasoning: string | null;
}

/**
 * GET /api/battles/history
 *
 * Returns recent match history with full details.
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - agentId: string (filter by agent)
 * - status: string (filter by status: completed, pending, in_progress, failed)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const agentId = searchParams.get('agentId');
    const status = searchParams.get('status');

    const supabase = getSupabase();

    // Build query
    let query = supabase
      .from('matches')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        agent_a_score,
        agent_b_score,
        judge_reasoning,
        challenge:challenges(id, name, type, difficulty),
        agent_a:agents!matches_agent_a_id_fkey(id, name, avatar_url),
        agent_b:agents!matches_agent_b_id_fkey(id, name, avatar_url),
        winner:agents!matches_winner_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (agentId) {
      query = query.or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId}`);
    }

    if (status && ['pending', 'in_progress', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status as 'pending' | 'in_progress' | 'completed' | 'failed');
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Failed to fetch match history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch match history' },
        { status: 500 }
      );
    }

    // Transform to cleaner format
    const history: MatchHistoryItem[] = (matches || []).map((match) => {
      // Type assertions for nested data
      const challenge = match.challenge as { id: string; name: string; type: string; difficulty: string } | null;
      const agentA = match.agent_a as { id: string; name: string; avatar_url: string | null } | null;
      const agentB = match.agent_b as { id: string; name: string; avatar_url: string | null } | null;
      const winner = match.winner as { id: string; name: string } | null;

      return {
        id: match.id,
        status: match.status,
        createdAt: match.created_at,
        completedAt: match.completed_at,
        challenge: challenge
          ? {
              id: challenge.id,
              name: challenge.name,
              type: challenge.type,
              difficulty: challenge.difficulty,
            }
          : {
              id: 'unknown',
              name: 'Unknown Challenge',
              type: 'unknown',
              difficulty: 'medium',
            },
        agentA: {
          id: agentA?.id || 'unknown',
          name: agentA?.name || 'Unknown Agent',
          score: match.agent_a_score,
          avatarUrl: agentA?.avatar_url || null,
        },
        agentB: {
          id: agentB?.id || 'unknown',
          name: agentB?.name || 'Unknown Agent',
          score: match.agent_b_score,
          avatarUrl: agentB?.avatar_url || null,
        },
        winner: winner
          ? {
              id: winner.id,
              name: winner.name,
            }
          : null,
        reasoning: match.judge_reasoning,
      };
    });

    return NextResponse.json({
      success: true,
      count: history.length,
      matches: history,
    });
  } catch (error) {
    console.error('Match history error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch match history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/battles/history/[matchId]
 *
 * Get detailed information about a specific match.
 * This would be better as a separate route file, but included here for completeness.
 */
