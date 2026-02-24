/**
 * Cleanup CRON Route
 * Runs daily to clean up expired queue entries and old data
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify CRON secret (Vercel sets this header for CRON jobs)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Clean up expired queue entries
    const { error: queueError } = await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('status', 'expired')
      .lt('queued_at', oneDayAgo.toISOString());

    if (queueError) {
      console.error('Queue cleanup error:', queueError);
    }

    // Clean up matched queue entries older than 1 day
    const { error: matchedError } = await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('status', 'matched')
      .lt('queued_at', oneDayAgo.toISOString());

    if (matchedError) {
      console.error('Matched cleanup error:', matchedError);
    }

    // Cancel stale open battles (registration closed but never started)
    const { data: staleBattles, error: staleError } = await supabase
      .from('battle_royales')
      .select('id')
      .eq('status', 'open')
      .lt('registration_closes_at', oneDayAgo.toISOString());

    if (staleError) {
      console.error('Stale battles error:', staleError);
    } else if (staleBattles && staleBattles.length > 0) {
      await supabase
        .from('battle_royales')
        .update({ status: 'cancelled' })
        .in('id', staleBattles.map(b => b.id));
    }

    // Clean up old completed battles data (keep summary, remove detailed scores)
    const { error: roundsError } = await supabase
      .from('battle_royale_rounds')
      .delete()
      .lt('completed_at', oneWeekAgo.toISOString());

    if (roundsError) {
      console.error('Rounds cleanup error:', roundsError);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      cleanup: {
        stale_battles_cancelled: staleBattles?.length || 0,
      },
    });
  } catch (err) {
    console.error('CRON cleanup error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
