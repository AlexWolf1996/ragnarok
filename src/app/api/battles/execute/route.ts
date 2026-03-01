/**
 * Battle Execute API — DISABLED
 *
 * Direct battles bypass the scheduler and create orphan matches.
 * All battles now go through the arena scheduler.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Direct battles disabled. Use the arena.' },
    { status: 403 },
  );
}
