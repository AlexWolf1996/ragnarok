/**
 * Payout Queue Processor Endpoint
 *
 * Called by cron (or manually) to process pending payouts one at a time.
 * Uses FOR UPDATE SKIP LOCKED internally — safe to call concurrently.
 *
 * GET /api/payouts/process
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPayoutQueue } from '@/lib/payouts/processor';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  // Verify cron secret (skip in development)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process up to 5 pending payouts per invocation
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await processPayoutQueue();
      results.push(result);
      // Stop if no more pending items
      if (result.processed === 0) break;
    }

    const totals = results.reduce(
      (acc, r) => ({
        processed: acc.processed + r.processed,
        succeeded: acc.succeeded + r.succeeded,
        failed: acc.failed + r.failed,
        errors: [...acc.errors, ...r.errors],
      }),
      { processed: 0, succeeded: 0, failed: 0, errors: [] as string[] },
    );

    console.log(
      `[PayoutCron] Done: ${totals.processed} processed, ${totals.succeeded} succeeded, ${totals.failed} failed`,
    );

    return NextResponse.json({ success: true, ...totals });
  } catch (error) {
    console.error('[PayoutCron] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
