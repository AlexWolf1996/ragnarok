/**
 * Payout Queue Processor
 *
 * Claims one pending payout at a time using Postgres FOR UPDATE SKIP LOCKED
 * (via the claim_pending_payout RPC function) and sends the SOL payout.
 * Failed payouts retry up to max_attempts times before being marked 'failed'.
 * Creates notifications on success and permanent failure.
 */

import { getSupabaseAdmin } from '@/lib/battles/engine';
import { sendPayout } from '@/lib/solana/payout';
import { solToLamports } from '@/lib/solana/transfer';
import { logTreasuryMovement, getTreasuryBalance } from '@/lib/treasury/logger';

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Look up the winner agent's name for notification messages.
 */
async function getWinnerAgentName(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  matchId: string,
): Promise<string> {
  const { data: match } = await supabase
    .from('matches')
    .select('winner_id')
    .eq('id', matchId)
    .single();

  if (match?.winner_id) {
    const { data: agent } = await supabase
      .from('agents')
      .select('name')
      .eq('id', match.winner_id)
      .single();
    if (agent?.name) return agent.name;
  }
  return 'your agent';
}

/**
 * Process one pending payout from the queue.
 * Safe to call concurrently — Postgres SKIP LOCKED ensures no double-processing.
 */
export async function processPayoutQueue(): Promise<ProcessResult> {
  const supabase = getSupabaseAdmin();
  const result: ProcessResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Claim one pending payout atomically
  const { data: items, error: claimError } = await supabase.rpc('claim_pending_payout');

  if (claimError) {
    console.error('[PayoutProcessor] Claim error:', claimError.message);
    result.errors.push(claimError.message);
    return result;
  }

  if (!items || items.length === 0) {
    console.log('[PayoutProcessor] No pending payouts');
    return result;
  }

  const item = items[0];
  result.processed = 1;

  console.log(
    `[PayoutProcessor] Processing payout ${item.id} for match ${item.match_id}: ${item.amount_sol} SOL to ${item.wallet_address}`,
  );

  try {
    const amountLamports = solToLamports(Number(item.amount_sol));
    const payoutResult = await sendPayout(item.wallet_address, amountLamports);

    if (payoutResult.success && payoutResult.signature) {
      // Success — mark completed
      await supabase
        .from('payout_queue')
        .update({
          status: 'completed',
          tx_signature: payoutResult.signature,
          processed_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Update match record
      await supabase
        .from('matches')
        .update({
          bet_status: 'paid',
          payout_tx_signature: payoutResult.signature,
        })
        .eq('id', item.match_id);

      // Log payout in treasury audit log
      const balance = await getTreasuryBalance();
      await logTreasuryMovement({
        type: 'payout_sent',
        matchId: item.match_id,
        walletAddress: item.wallet_address,
        amountSol: -Number(item.amount_sol),
        txSignature: payoutResult.signature,
        balanceAfter: balance,
      });

      // Notification: payout completed
      const agentName = await getWinnerAgentName(supabase, item.match_id);
      await supabase.from('notifications').insert({
        wallet_address: item.wallet_address,
        type: 'payout_completed',
        title: 'Payout Sent!',
        message: `You won ${item.amount_sol} SOL from your bet on ${agentName}!`,
        match_id: item.match_id,
      });

      console.log(`[PayoutProcessor] Payout ${item.id} completed: ${payoutResult.signature}`);
      result.succeeded = 1;
    } else {
      // Failed — retry or mark permanently failed
      const permanentlyFailed = item.attempts >= item.max_attempts;

      await supabase
        .from('payout_queue')
        .update({
          status: permanentlyFailed ? 'failed' : 'pending',
          error_message: payoutResult.error || 'Payout failed',
          processed_at: permanentlyFailed ? new Date().toISOString() : null,
        })
        .eq('id', item.id);

      if (permanentlyFailed) {
        await supabase
          .from('matches')
          .update({ bet_status: 'payout_failed' })
          .eq('id', item.match_id);

        // Notification: permanent failure
        await supabase.from('notifications').insert({
          wallet_address: item.wallet_address,
          type: 'payout_failed',
          title: 'Payout Failed',
          message: `Your payout of ${item.amount_sol} SOL failed. Try manual claim at /api/battles/payout?match_id=${item.match_id}`,
          match_id: item.match_id,
        });
      }

      console.log(
        `[PayoutProcessor] Payout ${item.id} failed (attempt ${item.attempts}/${item.max_attempts}): ${payoutResult.error}`,
      );
      result.failed = 1;
      result.errors.push(payoutResult.error || 'Payout failed');
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const permanentlyFailed = item.attempts >= item.max_attempts;

    await supabase
      .from('payout_queue')
      .update({
        status: permanentlyFailed ? 'failed' : 'pending',
        error_message: errorMessage,
        processed_at: permanentlyFailed ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    if (permanentlyFailed) {
      await supabase
        .from('matches')
        .update({ bet_status: 'payout_failed' })
        .eq('id', item.match_id);

      // Notification: permanent failure
      await supabase.from('notifications').insert({
        wallet_address: item.wallet_address,
        type: 'payout_failed',
        title: 'Payout Failed',
        message: `Your payout of ${item.amount_sol} SOL failed. Try manual claim at /api/battles/payout?match_id=${item.match_id}`,
        match_id: item.match_id,
      });
    }

    console.error(`[PayoutProcessor] Error processing payout ${item.id}:`, errorMessage);
    result.failed = 1;
    result.errors.push(errorMessage);
  }

  return result;
}
