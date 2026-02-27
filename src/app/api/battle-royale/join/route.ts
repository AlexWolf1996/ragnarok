/**
 * Join Battle Royale API
 * POST: Register an agent in a battle royale (after SOL payment)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { verifyTransactionDetails, BettingTier } from '@/lib/solana/transfer';
import { isValidUUID, isValidWalletAddress, isValidTransactionSignature } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battle_id, agent_id, wallet_address, tx_signature } = body;

    // Validate required fields
    if (!battle_id || !agent_id || !wallet_address || !tx_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: battle_id, agent_id, wallet_address, tx_signature' },
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

    const supabase = getSupabaseAdmin();

    // Fetch battle
    const { data: battle, error: battleError } = await supabase
      .from('battle_royales')
      .select('*')
      .eq('id', battle_id)
      .single();

    if (battleError || !battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      );
    }

    // Validate battle is open
    if (battle.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Battle is not accepting registrations' },
        { status: 400 }
      );
    }

    // Check registration hasn't closed
    if (new Date(battle.registration_closes_at) <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Registration has closed' },
        { status: 400 }
      );
    }

    // Check capacity
    if (battle.max_agents && battle.participant_count >= battle.max_agents) {
      return NextResponse.json(
        { success: false, error: 'Battle is full' },
        { status: 400 }
      );
    }

    // Verify agent exists and belongs to wallet
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, wallet_address')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.wallet_address !== wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Agent does not belong to this wallet' },
        { status: 403 }
      );
    }

    // Check agent isn't already in this battle
    const { data: existing } = await supabase
      .from('battle_royale_participants')
      .select('id')
      .eq('battle_id', battle_id)
      .eq('agent_id', agent_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Agent already registered for this battle' },
        { status: 400 }
      );
    }

    // Verify the Solana transaction (buy-in payment)
    // Use tier-based verification since BR tiers match betting tiers
    console.log(`[BR Join] Verifying transaction: ${tx_signature} for tier: ${battle.tier}`);
    const verification = await verifyTransactionDetails(tx_signature, battle.tier as BettingTier);

    if (!verification.valid) {
      console.error(`[BR Join] Verification failed: ${verification.error}`);
      return NextResponse.json(
        { success: false, error: verification.error || 'Transaction verification failed' },
        { status: 400 }
      );
    }

    // Insert participant
    const { data: participant, error: insertError } = await supabase
      .from('battle_royale_participants')
      .insert({
        battle_id,
        agent_id,
        round_scores: [],
        total_score: 0,
        payout_sol: 0,
      })
      .select('id')
      .single();

    if (insertError || !participant) {
      console.error('[BR Join] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to register participant' },
        { status: 500 }
      );
    }

    // Update battle pool and participant count
    await supabase
      .from('battle_royales')
      .update({
        participant_count: battle.participant_count + 1,
        total_pool_sol: battle.total_pool_sol + battle.buy_in_sol,
      })
      .eq('id', battle_id);

    console.log(`[BR Join] ${agent.name} joined battle ${battle.name} (participant #${battle.participant_count + 1})`);

    return NextResponse.json({
      success: true,
      participant_id: participant.id,
      message: `${agent.name} has entered the battle!`,
    });
  } catch (error) {
    console.error('[BR Join] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
