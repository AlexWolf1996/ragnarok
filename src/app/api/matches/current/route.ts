/**
 * Current Match Endpoint
 *
 * GET /api/matches/current — active match with agents, category, status, times, current odds
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { calculateParimutuelOdds } from '@/lib/bets/parimutuel';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Find active match (in_progress > betting_open > judging priority)
    const activeStatuses = ['in_progress', 'betting_open', 'judging'] as const;

    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        id, status, category, created_at, started_at, starts_at,
        betting_opens_at, completed_at, scheduled_at,
        agent_a_id, agent_b_id, winner_id,
        agent_a_score, agent_b_score
      `)
      .in('status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !match) {
      return NextResponse.json({ success: true, match: null });
    }

    // Fetch agent details
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, avatar_url, elo_rating, wins, losses, matches_played')
      .in('id', [match.agent_a_id, match.agent_b_id]);

    const agentA = agents?.find((a) => a.id === match.agent_a_id);
    const agentB = agents?.find((a) => a.id === match.agent_b_id);

    // Get current odds
    let odds = null;
    try {
      odds = await calculateParimutuelOdds(match.id);
    } catch {
      // No bets yet — odds not available
    }

    // Calculate time remaining
    const now = Date.now();
    const startsAt = match.starts_at ? new Date(match.starts_at).getTime() : null;
    const timeRemainingMs = startsAt ? Math.max(0, startsAt - now) : null;

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        agentA,
        agentB,
        odds,
        timeRemainingMs,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
