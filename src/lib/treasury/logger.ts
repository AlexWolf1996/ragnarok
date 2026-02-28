/**
 * Treasury Audit Logger
 *
 * Logs all SOL movements for reconciliation.
 * Positive amount_sol = incoming (bet received), negative = outgoing (payout sent).
 */

import { getSupabaseAdmin } from '@/lib/battles/engine';

type TreasuryLogType = 'bet_received' | 'payout_sent' | 'rake_collected';

export async function logTreasuryMovement(params: {
  type: TreasuryLogType;
  matchId: string;
  walletAddress: string;
  amountSol: number;
  txSignature: string;
  balanceAfter: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('treasury_log').insert({
    type: params.type,
    match_id: params.matchId,
    wallet_address: params.walletAddress,
    amount_sol: params.amountSol,
    tx_signature: params.txSignature,
    balance_after: params.balanceAfter,
  });

  if (error) {
    console.error('[TreasuryLog] Failed to log:', error.message);
  }
}

/**
 * Get treasury SOL balance (on-chain).
 */
export async function getTreasuryBalance(): Promise<number> {
  try {
    const { getConnection } = await import('@/lib/solana/config');
    const { PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
    const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET;
    if (!treasuryAddress) return 0;

    const connection = await getConnection();
    const balance = await connection.getBalance(new PublicKey(treasuryAddress));
    return balance / LAMPORTS_PER_SOL;
  } catch {
    console.error('[TreasuryLog] Failed to get treasury balance');
    return 0;
  }
}
