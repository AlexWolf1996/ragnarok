/**
 * Active Bets Endpoint
 *
 * GET /api/bets/active?wallet=<address>&match_id=<uuid>
 * Returns the user's bets on a specific match (or current active match).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const matchId = searchParams.get('match_id');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Missing wallet parameter' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Build query
    let query = supabase
      .from('bets')
      .select('id, match_id, agent_id, amount_sol, status, payout_sol, created_at')
      .eq('wallet_address', wallet)
      .order('created_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    } else {
      // Get bets on any active match
      const { data: activeMatches } = await supabase
        .from('matches')
        .select('id')
        .in('status', ['betting_open', 'in_progress', 'judging']);

      const activeIds = (activeMatches || []).map((m) => m.id);
      if (activeIds.length === 0) {
        return NextResponse.json({ success: true, bets: [] });
      }
      query = query.in('match_id', activeIds);
    }

    const { data: bets, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, bets: bets || [] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
