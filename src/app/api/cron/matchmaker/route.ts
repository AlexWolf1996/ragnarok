/**
 * Matchmaker CRON Route
 * Processes the matchmaking queue: pairs up waiting agents and triggers 1v1 battles.
 * Also triggers an auto-battle to keep the arena alive.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin, executeBattle } from '@/lib/battles/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify CRON secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const results: string[] = [];

    // Process matchmaking queue: pair up agents in the same tier
    const tiers = ['bifrost', 'midgard', 'asgard'] as const;

    for (const tier of tiers) {
      const { data: waiting, error } = await supabase
        .from('matchmaking_queue')
        .select('id, agent_id')
        .eq('tier', tier)
        .eq('status', 'waiting')
        .order('queued_at', { ascending: true })
        .limit(10);

      if (error || !waiting || waiting.length < 2) continue;

      // Pair agents up
      for (let i = 0; i + 1 < waiting.length; i += 2) {
        const agentAId = waiting[i].agent_id;
        const agentBId = waiting[i + 1].agent_id;

        try {
          // Mark as matched
          await supabase
            .from('matchmaking_queue')
            .update({ status: 'matched' })
            .in('id', [waiting[i].id, waiting[i + 1].id]);

          // Execute battle
          const battleResult = await executeBattle(agentAId, agentBId);
          results.push(`${tier}: ${battleResult.winner.name} defeats ${battleResult.loser.name}`);
        } catch (err) {
          results.push(`${tier}: match failed - ${err instanceof Error ? err.message : 'error'}`);
        }
      }
    }

    // Also trigger an auto-battle to keep the arena alive
    try {
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .order('elo_rating', { ascending: false });

      if (agents && agents.length >= 2) {
        const shuffled = agents.sort(() => Math.random() - 0.5);
        const autoResult = await executeBattle(shuffled[0].id, shuffled[1].id);
        results.push(`auto: ${autoResult.winner.name} defeats ${autoResult.loser.name}`);
      }
    } catch (err) {
      results.push(`auto: failed - ${err instanceof Error ? err.message : 'error'}`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
