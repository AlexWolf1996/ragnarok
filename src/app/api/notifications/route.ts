/**
 * Notifications API
 *
 * GET /api/notifications?wallet={address} — returns unread notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { isValidWalletAddress } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: 'wallet parameter is required' },
      { status: 400 },
    );
  }

  if (!isValidWalletAddress(wallet)) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallet address format' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('wallet_address', wallet)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, notifications: data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
