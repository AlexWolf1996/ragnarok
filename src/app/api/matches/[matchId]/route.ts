/**
 * Match Detail Endpoint
 *
 * GET /api/matches/{matchId} — returns full match detail with agent responses, judge scores, and challenge
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { isValidUUID } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  if (!isValidUUID(matchId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid match ID format' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        id, status, category, created_at, started_at, completed_at,
        agent_a_id, agent_b_id, winner_id,
        agent_a_score, agent_b_score,
        agent_a_response, agent_b_response,
        judge_scores, judge_reasoning,
        is_split_decision, is_unanimous,
        challenge_id
      `)
      .eq('id', matchId)
      .single();

    if (error || !match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 },
      );
    }

    // Fetch agents
    const agentIds = [match.agent_a_id, match.agent_b_id];
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, avatar_url, elo_rating')
      .in('id', agentIds);

    const agentMap = new Map((agents || []).map((a) => [a.id, a]));

    // Fetch challenge if present
    let challenge = null;
    if (match.challenge_id) {
      const { data: ch } = await supabase
        .from('challenges')
        .select('id, name, type, difficulty_level, prompt')
        .eq('id', match.challenge_id)
        .single();
      challenge = ch;
    }

    const enriched = {
      ...match,
      agentA: agentMap.get(match.agent_a_id) || null,
      agentB: agentMap.get(match.agent_b_id) || null,
      winner: match.winner_id ? agentMap.get(match.winner_id) || null : null,
      challenge,
    };

    return NextResponse.json({ success: true, match: enriched });
  } catch (err) {
    console.error('Error fetching match detail:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load match details' },
      { status: 500 },
    );
  }
}
