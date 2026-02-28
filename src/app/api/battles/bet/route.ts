/**
 * Betting Battle API Endpoint
 *
 * Executes a battle after verifying SOL payment.
 * User places bet on which agent will win.
 *
 * POST body:
 * - agentAId: UUID
 * - agentBId: UUID
 * - bettorWallet: string (Solana wallet address)
 * - bettorPickId: UUID (which agent they bet on)
 * - tier: 'bifrost' | 'midgard' | 'asgard'
 * - txSignature: string (Solana transaction signature)
 * - challengeId?: UUID (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeBattle, getSupabaseAdmin } from '@/lib/battles/engine';
import { verifyTransactionDetails, BETTING_TIERS, solToLamports, BettingTier } from '@/lib/solana/transfer';
import { processPayoutQueue } from '@/lib/payouts/processor';
import { settleMatch } from '@/lib/bets/parimutuel';
import { logTreasuryMovement, getTreasuryBalance } from '@/lib/treasury/logger';
import { isValidUUID, isValidWalletAddress, isValidTransactionSignature } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface BetBattleRequest {
  agentAId: string;
  agentBId: string;
  bettorWallet: string;
  bettorPickId: string;
  tier: BettingTier;
  txSignature: string;
  challengeId?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: BetBattleRequest = await request.json();
    const { agentAId, agentBId, bettorWallet, bettorPickId, tier, txSignature, challengeId } = body;

    // Validate required fields
    if (!agentAId || !agentBId || !bettorWallet || !bettorPickId || !tier || !txSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate UUID formats
    if (!isValidUUID(agentAId) || !isValidUUID(agentBId) || !isValidUUID(bettorPickId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agent ID format' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!isValidWalletAddress(bettorWallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Validate transaction signature format
    if (!isValidTransactionSignature(txSignature)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction signature format' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!['bifrost', 'midgard', 'asgard'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier. Must be bifrost, midgard, or asgard.' },
        { status: 400 }
      );
    }

    // Validate bettor picked one of the agents
    if (bettorPickId !== agentAId && bettorPickId !== agentBId) {
      return NextResponse.json(
        { success: false, error: 'Bettor must pick one of the battling agents' },
        { status: 400 }
      );
    }

    // Idempotency check: if this TX signature was already used, return the existing match
    const supabaseCheck = getSupabaseAdmin();
    const { data: existingMatch } = await supabaseCheck
      .from('matches')
      .select('*')
      .eq('bet_tx_signature', txSignature)
      .single();

    if (existingMatch) {
      console.log(`[BetBattle] Duplicate TX signature detected: ${txSignature}, returning existing match ${existingMatch.id}`);
      return NextResponse.json({
        success: true,
        matchId: existingMatch.id,
        duplicate: true,
        message: 'This transaction was already processed.',
      });
    }

    // Verify the transaction on-chain (amount, recipient, confirmation)
    console.log(`[BetBattle] Verifying transaction: ${txSignature} for tier: ${tier}`);
    const verification = await verifyTransactionDetails(txSignature, tier);

    if (!verification.valid) {
      console.error(`[BetBattle] Verification failed: ${verification.error}`);
      return NextResponse.json(
        { success: false, error: verification.error || 'Transaction verification failed. Please try again.' },
        { status: 400 }
      );
    }

    console.log(`[BetBattle] Transaction verified (amount, recipient, confirmed). Executing battle...`);

    // Execute the battle
    const result = await executeBattle(agentAId, agentBId, challengeId);

    // Update match with betting info
    const supabase = getSupabaseAdmin();
    const betAmountLamports = solToLamports(BETTING_TIERS[tier]);
    const betWon = result.winner.id === bettorPickId;

    // Update match with betting info
    await supabase
      .from('matches')
      .update({
        bet_amount_lamports: betAmountLamports,
        bettor_wallet: bettorWallet,
        bettor_pick_id: bettorPickId,
        bet_tx_signature: txSignature,
        tier: tier,
      })
      .eq('id', result.matchId);

    // Insert bet into bets table (for parimutuel odds calculation)
    await supabase.from('bets').insert({
      match_id: result.matchId,
      wallet_address: bettorWallet,
      agent_id: bettorPickId,
      amount_sol: BETTING_TIERS[tier],
      tx_signature: txSignature,
    });

    // Log bet received in treasury audit log
    getTreasuryBalance().then((balance) => {
      logTreasuryMovement({
        type: 'bet_received',
        matchId: result.matchId,
        walletAddress: bettorWallet,
        amountSol: BETTING_TIERS[tier],
        txSignature: txSignature,
        balanceAfter: balance,
      }).catch((err) => console.error('[BetBattle] Treasury log error:', err));
    });

    // Settle match: calculate parimutuel payouts, queue them, mark bet statuses
    let payoutStatus: string = 'lost';

    if (betWon) {
      console.log(`[BetBattle] Bettor won! Settling match ${result.matchId}`);
      try {
        const settlement = await settleMatch(result.matchId, result.winner.id);
        console.log(`[BetBattle] Settlement: ${settlement.bettorsSettled} bettors, ${settlement.totalPayouts} SOL total`);
        payoutStatus = 'queued';

        await supabase
          .from('matches')
          .update({ bet_status: 'queued' })
          .eq('id', result.matchId);

        // Process queue inline (non-blocking best-effort)
        processPayoutQueue().catch((err) => {
          console.error('[BetBattle] Inline payout processing error:', err);
        });
      } catch (settleErr) {
        console.error('[BetBattle] Settlement error:', settleErr);
        payoutStatus = 'payout_failed';
        await supabase
          .from('matches')
          .update({ bet_status: 'payout_failed' })
          .eq('id', result.matchId);
      }
    } else {
      await supabase
        .from('matches')
        .update({ bet_status: 'lost' })
        .eq('id', result.matchId);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      matchId: result.matchId,
      duration: `${duration}ms`,
      bet: {
        tier,
        amountSol: BETTING_TIERS[tier],
        amountLamports: betAmountLamports,
        pickedAgent: bettorPickId,
        won: betWon,
        payoutStatus,
      },
      battle: {
        agentA: {
          id: result.agentA.id,
          name: result.agentA.name,
          score: result.agentA.score,
          eloDelta: result.agentA.eloDelta,
          isWinner: result.agentA.isWinner,
          response: result.agentA.response,
        },
        agentB: {
          id: result.agentB.id,
          name: result.agentB.name,
          score: result.agentB.score,
          eloDelta: result.agentB.eloDelta,
          isWinner: result.agentB.isWinner,
          response: result.agentB.response,
        },
        challenge: result.challenge,
        winner: result.winner,
        loser: result.loser,
        reasoning: result.reasoning,
        judges: result.judges,
        isSplitDecision: result.isSplitDecision,
        isUnanimous: result.isUnanimous,
      },
    });

  } catch (error) {
    console.error('[BetBattle] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Battle execution failed',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}
