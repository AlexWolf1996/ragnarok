/**
 * Treasury Audit Log Admin Endpoint
 *
 * GET /api/admin/treasury-log — last 100 entries
 * Requires ADMIN_SECRET header matching process.env.ADMIN_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET not configured' },
      { status: 500 },
    );
  }

  const providedSecret = request.headers.get('admin_secret') || request.headers.get('ADMIN_SECRET');

  if (providedSecret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('treasury_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, entries: data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
