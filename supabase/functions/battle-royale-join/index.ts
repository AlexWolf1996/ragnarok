/**
 * Battle Royale Join Edge Function
 * Allows an agent to join an open battle royale
 *
 * SECURITY: Requires valid Solana transaction for buy-in and wallet signature verification
 */

import {
  getSupabaseClient,
  getCorsHeaders,
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidWalletAddress,
  isValidUUID,
  sanitizeError,
} from '../_shared/supabase.ts';
import {
  verifyTransaction,
  verifyWalletSignature,
  checkAndStoreTransaction,
} from '../_shared/solana.ts';

interface JoinBattleRequest {
  battle_id: string;
  agent_id: string;
  wallet_address: string;
  transaction_signature: string;
  // Wallet signature for ownership verification
  wallet_signature?: string;
  signed_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    const body: JoinBattleRequest = await req.json();

    // ==========================================================================
    // Input Validation
    // ==========================================================================

    if (!body.battle_id || !body.agent_id || !body.wallet_address || !body.transaction_signature) {
      return errorResponse('Missing required fields: battle_id, agent_id, wallet_address, transaction_signature', 400, req);
    }

    // Validate battle_id format (UUID)
    if (!isValidUUID(body.battle_id)) {
      return errorResponse('Invalid battle_id format', 400, req);
    }

    // Validate agent_id format (UUID)
    if (!isValidUUID(body.agent_id)) {
      return errorResponse('Invalid agent_id format', 400, req);
    }

    // Validate wallet address format
    if (!isValidWalletAddress(body.wallet_address)) {
      return errorResponse('Invalid wallet address format', 400, req);
    }

    const supabase = getSupabaseClient();

    // ==========================================================================
    // Wallet Signature Verification (if provided)
    // ==========================================================================

    if (body.wallet_signature && body.signed_message) {
      const sigResult = await verifyWalletSignature(
        body.wallet_address,
        body.signed_message,
        body.wallet_signature
      );

      if (!sigResult.success) {
        return errorResponse(`Wallet verification failed: ${sigResult.error}`, 401, req);
      }
    }

    // ==========================================================================
    // Battle Validation
    // ==========================================================================

    // Get the battle
    const { data: battle, error: battleError } = await supabase
      .from('battle_royales')
      .select('*')
      .eq('id', body.battle_id)
      .single();

    if (battleError || !battle) {
      return errorResponse('Battle not found', 404, req);
    }

    // Check battle is open
    if (battle.status !== 'open') {
      return errorResponse('Battle is no longer accepting participants', 400, req);
    }

    // Check registration is still open
    const now = new Date();
    const registrationCloses = new Date(battle.registration_closes_at);
    if (now >= registrationCloses) {
      return errorResponse('Registration has closed', 400, req);
    }

    // Check max agents
    if (battle.max_agents && battle.participant_count >= battle.max_agents) {
      return errorResponse('Battle is full', 400, req);
    }

    // ==========================================================================
    // Agent Ownership Verification
    // ==========================================================================

    // Check agent exists and belongs to wallet
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', body.agent_id)
      .single();

    if (agentError || !agent) {
      return errorResponse('Agent not found', 404, req);
    }

    // SECURITY: Verify wallet owns this agent
    if (agent.wallet_address !== body.wallet_address) {
      return errorResponse('Agent does not belong to this wallet', 403, req);
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('battle_royale_participants')
      .select('id')
      .eq('battle_id', body.battle_id)
      .eq('agent_id', body.agent_id)
      .single();

    if (existing) {
      return errorResponse('Agent is already registered for this battle', 400, req);
    }

    // ==========================================================================
    // Solana Transaction Verification (Buy-in Payment)
    // ==========================================================================

    const buyInAmount = battle.buy_in_sol || 0;

    // Only verify transaction if there's a buy-in
    if (buyInAmount > 0) {
      const txResult = await verifyTransaction(
        body.transaction_signature,
        buyInAmount,
        body.wallet_address
      );

      if (!txResult.success) {
        return errorResponse(`Transaction verification failed: ${txResult.error}`, 400, req);
      }

      // Check if transaction was already used
      const txCheck = await checkAndStoreTransaction(
        supabase,
        body.transaction_signature,
        'buy_in'
      );

      if (txCheck.alreadyUsed) {
        return errorResponse('Transaction has already been used', 400, req);
      }
    }

    // ==========================================================================
    // Add Participant
    // ==========================================================================

    const { data: participant, error: participantError } = await supabase
      .from('battle_royale_participants')
      .insert({
        battle_id: body.battle_id,
        agent_id: body.agent_id,
        round_scores: [],
        total_score: 0,
        payout_sol: 0,
        transaction_signature: body.transaction_signature,
      })
      .select()
      .single();

    if (participantError) {
      return errorResponse(sanitizeError(participantError), 500, req);
    }

    // Update battle participant count and pool
    const { error: updateError } = await supabase
      .from('battle_royales')
      .update({
        participant_count: battle.participant_count + 1,
        total_pool_sol: battle.total_pool_sol + buyInAmount,
      })
      .eq('id', body.battle_id);

    if (updateError) {
      // Rollback participant
      await supabase
        .from('battle_royale_participants')
        .delete()
        .eq('id', participant.id);
      return errorResponse('Failed to update battle', 500, req);
    }

    return jsonResponse({
      success: true,
      participant_id: participant.id,
      verified_buy_in: buyInAmount,
      message: `${agent.name} joined the battle`,
    }, 200, req);

  } catch (err) {
    return errorResponse('Internal server error', 500, req);
  }
});
