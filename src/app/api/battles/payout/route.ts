/**
 * Manual Payout API Endpoint
 *
 * Retries payout for matches where auto-payout failed.
 * POST body: { match_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { sendPayout } from '@/lib/solana/payout';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { match_id } = await request.json();

    if (!match_id) {
      return NextResponse.json(
        { success: false, error: 'match_id is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch match and validate
    const { data: match, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single();

    if (fetchError || !match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 },
      );
    }

    if (!match.winner_id) {
      return NextResponse.json(
        { success: false, error: 'Match has no winner yet' },
        { status: 400 },
      );
    }

    if (!match.bettor_wallet || !match.bet_amount_lamports) {
      return NextResponse.json(
        { success: false, error: 'Match has no bet data' },
        { status: 400 },
      );
    }

    // Only pay out won or payout_failed bets that haven't been paid yet
    if (match.bet_status !== 'won' && match.bet_status !== 'payout_failed') {
      return NextResponse.json(
        { success: false, error: `Cannot pay out bet with status: ${match.bet_status}` },
        { status: 400 },
      );
    }

    if (match.payout_tx_signature) {
      return NextResponse.json(
        { success: false, error: 'Payout already sent', signature: match.payout_tx_signature },
        { status: 400 },
      );
    }

    // Send payout
    const result = await sendPayout(
      match.bettor_wallet,
      match.bet_amount_lamports,
    );

    if (result.success && result.signature) {
      await supabase
        .from('matches')
        .update({
          payout_tx_signature: result.signature,
          bet_status: 'paid',
        })
        .eq('id', match_id);

      return NextResponse.json({
        success: true,
        signature: result.signature,
        payoutLamports: result.payoutLamports,
      });
    } else {
      await supabase
        .from('matches')
        .update({ bet_status: 'payout_failed' })
        .eq('id', match_id);

      return NextResponse.json(
        { success: false, error: result.error || 'Payout failed' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('[PayoutAPI] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
