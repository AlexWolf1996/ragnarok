/**
 * Mark Notification as Read
 *
 * POST /api/notifications/{id}/read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { isValidUUID } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid notification ID format' },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
