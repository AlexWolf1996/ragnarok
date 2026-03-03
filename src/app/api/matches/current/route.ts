/**
 * Current Match Endpoint
 *
 * GET /api/matches/current — active match with agents, category, status, times, current odds
 *
 * Self-healing: if a betting_open match has starts_at in the past,
 * fire-and-forget a call to the scheduler so the battle starts automatically.
 * This solves the daily-cron problem (Vercel Hobby only runs cron once/day).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { calculateParimutuelOdds } from '@/lib/bets/parimutuel';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Fire-and-forget trigger to the scheduler.
 * If the scheduler is already running (lock held), it will skip gracefully.
 */
function triggerScheduler() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;

  fetch(`${baseUrl}/api/cron/scheduler`, {
    method: 'POST',
    headers: cronSecret
      ? { Authorization: `Bearer ${cronSecret}` }
      : {},
  }).catch((err) => {
    console.error('[CurrentMatch] Scheduler trigger failed:', err);
  });
}

export async function GET(request: NextRequest) {
  try {
    // Soft rate limit: 30 req/min per IP (prevents bot abuse)
    const ip = getClientIp(request);
    const rateCheck = await checkRateLimit(`match-poll:${ip}`, 30);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)) } },
      );
    }

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
      // No active match — trigger scheduler to create one
      triggerScheduler();

      // Check for recently completed match (within 5 min)
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
        const response = NextResponse.json({ success: true, match: null });
        response.headers.set('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=5');
        return response;
      }

      // Return the recently completed match so user sees the result
      const { data: recentAgents } = await supabase
        .from('agents')
        .select('id, name, avatar_url, elo_rating, wins, losses, matches_played')
        .in('id', [recentMatch.agent_a_id, recentMatch.agent_b_id]);

      const response = NextResponse.json({
        success: true,
        match: {
          ...recentMatch,
          agentA: recentAgents?.find((a) => a.id === recentMatch.agent_a_id) ?? null,
          agentB: recentAgents?.find((a) => a.id === recentMatch.agent_b_id) ?? null,
          odds: null,
          timeRemainingMs: null,
        },
      });
      response.headers.set('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=5');
      return response;
    }

    // Self-healing: if betting_open match has starts_at in the past → trigger scheduler
    if (match.status === 'betting_open' && match.starts_at) {
      const startsAtMs = new Date(match.starts_at).getTime();
      if (startsAtMs <= Date.now()) {
        console.log(`[CurrentMatch] Stale betting_open match ${match.id} (starts_at passed), triggering scheduler`);
        triggerScheduler();
      }
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

    const response = NextResponse.json({
      success: true,
      match: {
        ...match,
        agentA,
        agentB,
        odds,
        timeRemainingMs,
      },
    });
    // Edge cache: serve stale for up to 5s while revalidating, fresh for 3s
    response.headers.set('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=5');
    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
