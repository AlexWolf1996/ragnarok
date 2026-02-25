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
 * - matchLimit: number (default 20)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const matchLimit = Math.min(100, Math.max(1, parseInt(searchParams.get('matchLimit') || '20', 10)));

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

    // Fetch ALL matches for stats calculations (ELO history, streak, etc.)
    const { data: allMatches, error: allMatchesError } = await supabase
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
        agent_a_response,
        agent_b_response,
        challenge:challenges(id, name, type, difficulty)
      `)
      .or(`agent_a_id.eq.${id},agent_b_id.eq.${id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true }); // Oldest first for ELO history calculation

    if (allMatchesError) {
      console.error('Failed to fetch matches:', allMatchesError);
    }

    const completedMatches = allMatches || [];

    // Get opponent names for each match
    const opponentIds = new Set<string>();
    completedMatches.forEach(m => {
      if (m.agent_a_id !== id) opponentIds.add(m.agent_a_id);
      if (m.agent_b_id !== id) opponentIds.add(m.agent_b_id);
    });

    const { data: opponents } = await supabase
      .from('agents')
      .select('id, name, avatar_url')
      .in('id', Array.from(opponentIds));

    const opponentMap = new Map(opponents?.map(o => [o.id, o]) || []);

    // Calculate ELO history by simulating through matches
    const eloHistory: { date: string; elo: number; matchId: string }[] = [];
    let currentElo = 1000; // Starting ELO
    let highestElo = 1000;
    const K = 32; // ELO K-factor

    // Track challenge type wins
    const challengeTypeWins: Record<string, number> = {};

    // Transform matches and calculate ELO history
    const processedMatches = completedMatches.map(match => {
      const isAgentA = match.agent_a_id === id;
      const opponentId = isAgentA ? match.agent_b_id : match.agent_a_id;
      const opponent = opponentMap.get(opponentId);
      const myScore = isAgentA ? match.agent_a_score : match.agent_b_score;
      const opponentScore = isAgentA ? match.agent_b_score : match.agent_a_score;
      const myResponse = isAgentA ? match.agent_a_response : match.agent_b_response;
      const opponentResponse = isAgentA ? match.agent_b_response : match.agent_a_response;
      const isWinner = match.winner_id === id;
      const isTie = match.winner_id === null;

      const challenge = match.challenge as { id: string; name: string; type: string; difficulty: string } | null;

      // Track challenge type wins
      if (isWinner && challenge) {
        challengeTypeWins[challenge.type] = (challengeTypeWins[challenge.type] || 0) + 1;
      }

      // Calculate ELO change for this match
      // We need opponent's ELO at that time, but we'll approximate with current method
      const opponentAgent = allAgents?.find(a => a.id === opponentId);
      const opponentElo = opponentAgent?.elo_rating || 1000;

      const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
      const actualScore = isWinner ? 1 : isTie ? 0.5 : 0;
      const eloDelta = Math.round(K * (actualScore - expectedScore));

      currentElo += eloDelta;
      if (currentElo > highestElo) {
        highestElo = currentElo;
      }

      // Record ELO after this match
      if (match.completed_at) {
        eloHistory.push({
          date: match.completed_at,
          elo: currentElo,
          matchId: match.id,
        });
      }

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
        myResponse: typeof myResponse === 'string' ? myResponse : JSON.stringify(myResponse),
        opponentResponse: typeof opponentResponse === 'string' ? opponentResponse : JSON.stringify(opponentResponse),
      };
    });

    // Reverse to get newest first for display
    const matchHistory = [...processedMatches].reverse().slice(0, matchLimit);

    // Calculate current streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | null = null;

    for (const match of [...processedMatches].reverse()) {
      if (streakType === null) {
        streakType = match.result === 'win' ? 'win' : match.result === 'loss' ? 'loss' : null;
        if (streakType) currentStreak = 1;
      } else if (
        (streakType === 'win' && match.result === 'win') ||
        (streakType === 'loss' && match.result === 'loss')
      ) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Find favorite challenge type (most wins)
    let favoriteChallenge: { type: string; wins: number } | null = null;
    for (const [type, wins] of Object.entries(challengeTypeWins)) {
      if (!favoriteChallenge || wins > favoriteChallenge.wins) {
        favoriteChallenge = { type, wins };
      }
    }

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
        systemPrompt: agent.system_prompt,
        eloRating: agent.elo_rating,
        highestElo: Math.max(highestElo, agent.elo_rating), // Use actual current if higher
        wins: agent.wins,
        losses: agent.losses,
        matchesPlayed: agent.matches_played,
        createdAt: agent.created_at,
        rank: rank + 1,
        winRate,
        avgScore,
        recentForm,
        currentStreak: {
          count: currentStreak,
          type: streakType,
        },
        favoriteChallenge,
      },
      matches: matchHistory,
      eloHistory: eloHistory.slice(-50), // Last 50 data points for chart
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
