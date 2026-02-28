/**
 * Recent Matches Endpoint
 *
 * GET /api/matches/recent — last 10 completed matches with results and scores
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id, status, category, created_at, started_at, completed_at,
        agent_a_id, agent_b_id, winner_id,
        agent_a_score, agent_b_score,
        is_split_decision, is_unanimous,
        judge_reasoning
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // Collect all agent IDs
    const agentIds = new Set<string>();
    for (const match of (matches || [])) {
      agentIds.add(match.agent_a_id);
      agentIds.add(match.agent_b_id);
    }

    // Fetch agents in batch
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, avatar_url, elo_rating')
      .in('id', Array.from(agentIds));

    const agentMap = new Map((agents || []).map((a) => [a.id, a]));

    const enriched = (matches || []).map((match) => ({
      ...match,
      agentA: agentMap.get(match.agent_a_id) || null,
      agentB: agentMap.get(match.agent_b_id) || null,
      winner: match.winner_id ? agentMap.get(match.winner_id) || null : null,
    }));

    return NextResponse.json({ success: true, matches: enriched });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
