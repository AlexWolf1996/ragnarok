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
import { verifyTransactionDetails, BETTING_TIERS, solToLamports, lamportsToSol, BettingTier } from '@/lib/solana/transfer';
import { sendPayout } from '@/lib/solana/payout';

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

    // Initial update with bet info
    await supabase
      .from('matches')
      .update({
        bet_amount_lamports: betAmountLamports,
        bettor_wallet: bettorWallet,
        bettor_pick_id: bettorPickId,
        bet_tx_signature: txSignature,
        bet_status: betWon ? 'won' : 'lost',
        tier: tier,
      })
      .eq('id', result.matchId);

    // Auto-payout if bettor won
    let payoutTxSignature: string | null = null;
    let payoutSol = 0;
    let payoutStatus: string = betWon ? 'won' : 'lost';

    if (betWon) {
      console.log(`[BetBattle] Bettor won! Initiating auto-payout for match ${result.matchId}`);
      try {
        const payoutResult = await sendPayout(bettorWallet, betAmountLamports);

        if (payoutResult.success && payoutResult.signature) {
          payoutTxSignature = payoutResult.signature;
          payoutSol = lamportsToSol(payoutResult.payoutLamports || 0);
          payoutStatus = 'paid';

          await supabase
            .from('matches')
            .update({
              payout_tx_signature: payoutResult.signature,
              bet_status: 'paid',
            })
            .eq('id', result.matchId);

          console.log(`[BetBattle] Payout sent: ${payoutResult.signature}`);
        } else {
          payoutStatus = 'payout_failed';
          await supabase
            .from('matches')
            .update({ bet_status: 'payout_failed' })
            .eq('id', result.matchId);

          console.error(`[BetBattle] Payout failed: ${payoutResult.error}`);
        }
      } catch (payoutErr) {
        payoutStatus = 'payout_failed';
        await supabase
          .from('matches')
          .update({ bet_status: 'payout_failed' })
          .eq('id', result.matchId);

        console.error('[BetBattle] Payout error:', payoutErr);
      }
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
        potentialPayout: betWon ? BETTING_TIERS[tier] * 1.9 : 0,
        payoutSol,
        payoutTxSignature,
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
