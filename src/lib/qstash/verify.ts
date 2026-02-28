/**
 * QStash Signature Verification
 *
 * Verifies incoming cron requests via two methods:
 * 1. QStash signature (Upstash-Signature header) — for QStash-triggered calls
 * 2. CRON_SECRET (Authorization: Bearer) — for Vercel crons and local testing
 *
 * Returns null if authorized, or a 401 Response if not.
 */

import { Receiver } from '@upstash/qstash';

/**
 * Verify that a request comes from QStash or has a valid CRON_SECRET.
 * Returns null if authorized, or a Response(401) if not.
 */
export async function verifyCronAuth(request: Request): Promise<Response | null> {
  // Path 1: QStash signature
  const signature = request.headers.get('upstash-signature');
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (signature && currentSigningKey && nextSigningKey) {
    try {
      const receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
      });

      // QStash sends a body hash in the JWT — we need the raw body
      const body = await request.clone().text();

      await receiver.verify({
        signature,
        body,
      });

      return null; // Authorized via QStash
    } catch (err) {
      console.error('[QStash] Signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid QStash signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Path 2: CRON_SECRET (Vercel crons / manual calls)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null; // Authorized via CRON_SECRET
  }

  // No CRON_SECRET configured = dev mode, allow all
  if (!cronSecret) {
    return null;
  }

  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
