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
      // No active match — check for recently completed match (within 5 min)
      // so users can see the result before the next match starts
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentMatch } = await supabase
        .from('matches')
        .select(`
          id, status, category, created_at, started_at, starts_at,
          betting_opens_at, completed_at, scheduled_at,
          agent_a_id, agent_b_id, winner_id,
          agent_a_score, agent_b_score
        `)
        .eq('status', 'completed')
        .gte('completed_at', fiveMinAgo)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (!recentMatch) {
        return NextResponse.json({ success: true, match: null });
      }

      // Return the recently completed match so user sees the result
      const { data: recentAgents } = await supabase
        .from('agents')
        .select('id, name, avatar_url, elo_rating, wins, losses, matches_played')
        .in('id', [recentMatch.agent_a_id, recentMatch.agent_b_id]);

      return NextResponse.json({
        success: true,
        match: {
          ...recentMatch,
          agentA: recentAgents?.find((a) => a.id === recentMatch.agent_a_id) ?? null,
          agentB: recentAgents?.find((a) => a.id === recentMatch.agent_b_id) ?? null,
          odds: null,
          timeRemainingMs: null,
        },
      });
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
