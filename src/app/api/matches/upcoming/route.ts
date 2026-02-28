/**
 * Upcoming Matches Endpoint
 *
 * GET /api/matches/upcoming — next 5 scheduled matches
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
        id, status, category, created_at, starts_at,
        betting_opens_at, scheduled_at,
        agent_a_id, agent_b_id
      `)
      .in('status', ['scheduled', 'betting_open'])
      .order('starts_at', { ascending: true })
      .limit(5);

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
    }));

    return NextResponse.json({ success: true, matches: enriched });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
