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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]
 * Get single agent profile with match history
 *
 * Query params:
 * - matchLimit: number (default 10)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const matchLimit = Math.min(50, Math.max(1, parseInt(searchParams.get('matchLimit') || '10', 10)));

    const supabase = getSupabase();

    // Fetch agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get agent's rank
    const { data: allAgents } = await supabase
      .from('agents')
      .select('id, elo_rating')
      .order('elo_rating', { ascending: false });

    const rank = allAgents?.findIndex(a => a.id === id) ?? -1;

    // Fetch recent matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        agent_a_score,
        agent_b_score,
        winner_id,
        judge_reasoning,
        agent_a_id,
        agent_b_id,
        challenge:challenges(id, name, type, difficulty)
      `)
      .or(`agent_a_id.eq.${id},agent_b_id.eq.${id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(matchLimit);

    if (matchesError) {
      console.error('Failed to fetch matches:', matchesError);
    }

    // Get opponent names for each match
    const opponentIds = new Set<string>();
    (matches || []).forEach(m => {
      if (m.agent_a_id !== id) opponentIds.add(m.agent_a_id);
      if (m.agent_b_id !== id) opponentIds.add(m.agent_b_id);
    });

    const { data: opponents } = await supabase
      .from('agents')
      .select('id, name, avatar_url')
      .in('id', Array.from(opponentIds));

    const opponentMap = new Map(opponents?.map(o => [o.id, o]) || []);

    // Transform matches with opponent info
    const matchHistory = (matches || []).map(match => {
      const isAgentA = match.agent_a_id === id;
      const opponentId = isAgentA ? match.agent_b_id : match.agent_a_id;
      const opponent = opponentMap.get(opponentId);
      const myScore = isAgentA ? match.agent_a_score : match.agent_b_score;
      const opponentScore = isAgentA ? match.agent_b_score : match.agent_a_score;
      const isWinner = match.winner_id === id;
      const isTie = match.winner_id === null;

      const challenge = match.challenge as { id: string; name: string; type: string; difficulty: string } | null;

      return {
        id: match.id,
        completedAt: match.completed_at,
        opponent: {
          id: opponentId,
          name: opponent?.name || 'Unknown',
          avatarUrl: opponent?.avatar_url,
        },
        myScore,
        opponentScore,
        result: isTie ? 'tie' : isWinner ? 'win' : 'loss',
        challenge: challenge ? {
          id: challenge.id,
          name: challenge.name,
          type: challenge.type,
          difficulty: challenge.difficulty,
        } : null,
        reasoning: match.judge_reasoning,
      };
    });

    // Calculate stats
    const winRate = agent.matches_played > 0
      ? Math.round((agent.wins / agent.matches_played) * 100)
      : 0;

    // Calculate recent form (last 5 matches)
    const recentForm = matchHistory.slice(0, 5).map(m => m.result);

    // Calculate average score
    const scores = matchHistory.map(m => m.myScore).filter((s): s is number => s !== null);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        avatarUrl: agent.avatar_url,
        walletAddress: agent.wallet_address,
        eloRating: agent.elo_rating,
        wins: agent.wins,
        losses: agent.losses,
        matchesPlayed: agent.matches_played,
        createdAt: agent.created_at,
        rank: rank + 1,
        winRate,
        avgScore,
        recentForm,
      },
      matches: matchHistory,
    });
  } catch (error) {
    console.error('Agent profile error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agent profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
