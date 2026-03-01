/**
 * Place Bet Endpoint
 *
 * Bets on pre-existing scheduled matches. Does NOT trigger a battle.
 * Battle execution happens separately via the scheduler (Task 12).
 *
 * POST body:
 * - match_id: UUID
 * - agent_id: UUID (which agent to bet on)
 * - amount_sol: number (minimum 0.01 SOL)
 * - tx_signature: string (Solana transaction signature)
 * - wallet_address: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { verifyTransactionDetails } from '@/lib/solana/transfer';
import { calculateParimutuelOdds } from '@/lib/bets/parimutuel';
import { logTreasuryMovement, getTreasuryBalance } from '@/lib/treasury/logger';
import { isValidUUID, isValidWalletAddress, isValidTransactionSignature } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface PlaceBetRequest {
  match_id: string;
  agent_id: string;
  amount_sol: number;
  tx_signature: string;
  wallet_address: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PlaceBetRequest = await request.json();
    const { match_id, agent_id, amount_sol, tx_signature, wallet_address } = body;

    // Validate required fields
    if (!match_id || !agent_id || !amount_sol || !tx_signature || !wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: match_id, agent_id, amount_sol, tx_signature, wallet_address' },
        { status: 400 },
      );
    }

    // Validate formats
    if (!isValidUUID(match_id) || !isValidUUID(agent_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid UUID format' },
        { status: 400 },
      );
    }

    if (!isValidWalletAddress(wallet_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 },
      );
    }

    if (!isValidTransactionSignature(tx_signature)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction signature format' },
        { status: 400 },
      );
    }

    // Validate amount (minimum 0.01 SOL)
    if (typeof amount_sol !== 'number' || amount_sol < 0.01) {
      return NextResponse.json(
        { success: false, error: 'Invalid bet amount. Minimum wager is 0.01 SOL.' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Check match exists and is open for betting
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, agent_a_id, agent_b_id, status')
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { success: false, error: 'Match not found' },
        { status: 404 },
      );
    }

    // Allow betting on matches with status 'pending' or 'betting_open'
    const openStatuses = ['pending', 'betting_open'];
    if (!openStatuses.includes(match.status)) {
      return NextResponse.json(
        { success: false, error: `Match is not open for betting (status: ${match.status})` },
        { status: 400 },
      );
    }

    // Validate agent_id is one of the match's agents
    if (agent_id !== match.agent_a_id && agent_id !== match.agent_b_id) {
      return NextResponse.json(
        { success: false, error: 'Agent is not part of this match' },
        { status: 400 },
      );
    }

    // Idempotency: check if tx_signature already used
    const { data: existingBet } = await supabase
      .from('bets')
      .select('id')
      .eq('tx_signature', tx_signature)
      .single();

    if (existingBet) {
      return NextResponse.json({
        success: true,
        bet_id: existingBet.id,
        duplicate: true,
        message: 'This transaction was already processed.',
      });
    }

    // Rate limit: max 5 bets/wallet/minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentBetCount } = await supabase
      .from('bets')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_address', wallet_address)
      .gte('created_at', oneMinuteAgo);

    if (recentBetCount !== null && recentBetCount >= 5) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Maximum 5 bets per minute.' },
        { status: 429 },
      );
    }

    // Verify Solana transaction on-chain
    console.log(`[PlaceBet] Verifying transaction: ${tx_signature} for ${amount_sol} SOL`);
    const verification = await verifyTransactionDetails(tx_signature, amount_sol);

    if (!verification.valid) {
      console.error(`[PlaceBet] Verification failed: ${verification.error}`);
      return NextResponse.json(
        { success: false, error: verification.error || 'Transaction verification failed' },
        { status: 400 },
      );
    }

    // Insert bet
    const { data: bet, error: insertError } = await supabase
      .from('bets')
      .insert({
        match_id,
        wallet_address,
        agent_id,
        amount_sol,
        tx_signature,
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle unique constraint violation (double-spend)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This transaction was already used for a bet' },
          { status: 409 },
        );
      }
      console.error('[PlaceBet] Insert error:', insertError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to place bet' },
        { status: 500 },
      );
    }

    // Log treasury movement (non-blocking)
    getTreasuryBalance().then((balance) => {
      logTreasuryMovement({
        type: 'bet_received',
        matchId: match_id,
        walletAddress: wallet_address,
        amountSol: amount_sol,
        txSignature: tx_signature,
        balanceAfter: balance,
      }).catch((err) => console.error('[PlaceBet] Treasury log error:', err));
    });

    // Get current odds after this bet
    const odds = await calculateParimutuelOdds(match_id);

    console.log(`[PlaceBet] Bet placed: ${bet.id} on match ${match_id}, ${amount_sol} SOL on agent ${agent_id}`);

    return NextResponse.json({
      success: true,
      bet_id: bet.id,
      current_odds: odds,
    });
  } catch (error) {
    console.error('[PlaceBet] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
