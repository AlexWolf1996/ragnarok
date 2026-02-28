/**
 * Payout Queue Processor Endpoint
 *
 * Called by QStash (every minute) or Vercel cron (daily fallback).
 * Uses FOR UPDATE SKIP LOCKED internally — safe to call concurrently.
 *
 * GET|POST /api/payouts/process
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPayoutQueue } from '@/lib/payouts/processor';
import { verifyCronAuth } from '@/lib/qstash/verify';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handler(request: NextRequest) {
  // Verify auth: QStash signature OR CRON_SECRET
  const authError = await verifyCronAuth(request);
  if (authError) return authError;

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

// GET: Vercel cron fallback | POST: QStash trigger
export const GET = handler;
export const POST = handler;
