/**
 * Place Battle Royale Spectator Bet
 *
 * POST body:
 * - battle_id: UUID
 * - agent_id: UUID (which agent to bet on — must be a participant)
 * - amount_sol: number (min 0.01 SOL)
 * - tx_signature: string (Solana transaction signature)
 * - wallet_address: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { verifyTransactionDetails } from '@/lib/solana/transfer';
import { isValidUUID, isValidWalletAddress, isValidTransactionSignature } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battle_id, agent_id, amount_sol, tx_signature, wallet_address } = body;

    // Validate required fields
    if (!battle_id || !agent_id || !amount_sol || !tx_signature || !wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: battle_id, agent_id, amount_sol, tx_signature, wallet_address' },
        { status: 400 }
      );
    }

    // Validate formats
    if (!isValidUUID(battle_id) || !isValidUUID(agent_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    if (!isValidWalletAddress(wallet_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (!isValidTransactionSignature(tx_signature)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction signature format' },
        { status: 400 }
      );
    }

    if (typeof amount_sol !== 'number' || amount_sol < 0.01) {
      return NextResponse.json(
        { success: false, error: 'Invalid bet amount. Minimum is 0.01 SOL.' },
        { status: 400 }
      );
    }

    if (amount_sol > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum bet is 10 SOL' },
        { status: 400 }
      );
    }

    // Rate limit: 5 bets/wallet/minute
    const rateCheck = await checkRateLimit(`br-bet:${wallet_address}`, 5);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check battle exists and is open or in_progress
    const { data: battle, error: battleError } = await supabase
      .from('battle_royales')
      .select('id, status')
      .eq('id', battle_id)
      .single();

    if (battleError || !battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      );
    }

    if (battle.status !== 'open' && battle.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: 'Battle is not accepting bets' },
        { status: 400 }
      );
    }

    // Verify agent is a participant in this battle
    const { data: participant } = await supabase
      .from('battle_royale_participants')
      .select('id')
      .eq('battle_id', battle_id)
      .eq('agent_id', agent_id)
      .single();

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Agent is not a participant in this battle' },
        { status: 400 }
      );
    }

    // Idempotency: check if tx_signature already used
    const { data: existingBet } = await supabase
      .from('battle_royale_bets')
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

    // Verify Solana transaction on-chain
    console.log(`[BR Bet] Verifying transaction: ${tx_signature} for ${amount_sol} SOL`);
    const verification = await verifyTransactionDetails(tx_signature, amount_sol);

    if (!verification.valid) {
      console.error(`[BR Bet] Verification failed: ${verification.error}`);
      return NextResponse.json(
        { success: false, error: verification.error || 'Transaction verification failed' },
        { status: 400 }
      );
    }

    // Insert bet with tx_signature
    const { data: bet, error: insertError } = await supabase
      .from('battle_royale_bets')
      .insert({
        battle_id,
        agent_id,
        amount_sol,
        wallet_address,
        tx_signature,
        status: 'pending',
        payout_sol: 0,
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This transaction was already used for a bet' },
          { status: 409 }
        );
      }
      console.error('[BR Bet] Insert error:', insertError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to place bet' },
        { status: 500 }
      );
    }

    console.log(`[BR Bet] Bet placed: ${bet.id} on battle ${battle_id}, ${amount_sol} SOL on agent ${agent_id}`);

    return NextResponse.json({
      success: true,
      bet_id: bet.id,
    });
  } catch (error) {
    console.error('[BR Bet] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
