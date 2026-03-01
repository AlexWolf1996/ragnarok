/**
 * My Challenges Endpoint
 *
 * GET /api/challenges/mine?wallet=<address>
 * Returns the user's submitted challenges with status, usage count, and rake earned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { isValidWalletAddress } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Missing wallet parameter' },
        { status: 400 },
      );
    }

    if (!isValidWalletAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: challenges, error } = await supabase
      .from('submitted_challenges')
      .select('id, category, challenge_text, status, rejection_reason, times_used, rake_earned, submitted_at')
      .eq('wallet_address', wallet)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch challenges:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch challenges' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, challenges: challenges || [] });
  } catch (err) {
    console.error('Unexpected error in /api/challenges/mine:', err);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
