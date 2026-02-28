/**
 * Match Odds Endpoint
 *
 * GET /api/matches/{matchId}/odds — returns current parimutuel odds
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateParimutuelOdds } from '@/lib/bets/parimutuel';
import { isValidUUID } from '@/lib/validation';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  if (!isValidUUID(matchId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid match ID format' },
      { status: 400 },
    );
  }

  try {
    const odds = await calculateParimutuelOdds(matchId);
    return NextResponse.json({ success: true, odds });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
