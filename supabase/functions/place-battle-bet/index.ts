/**
 * Place Battle Bet Edge Function
 * Places a spectator bet on a battle royale participant
 *
 * SECURITY: Requires valid Solana transaction and optional wallet signature
 */

import {
  getSupabaseClient,
  getCorsHeaders,
  jsonResponse,
  errorResponse,
  optionsResponse,
  isValidWalletAddress,
  isValidUUID,
  isValidBetAmount,
  sanitizeError,
} from '../_shared/supabase.ts';
import {
  verifyTransaction,
  verifyWalletSignature,
  checkAndStoreTransaction,
} from '../_shared/solana.ts';

interface PlaceBetRequest {
  battle_id: string;
  agent_id: string;
  amount_sol: number;
  wallet_address: string;
  transaction_signature: string;
  // Optional: wallet signature for enhanced security
  wallet_signature?: string;
  signed_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return optionsResponse(req);
  }

  try {
    const body: PlaceBetRequest = await req.json();

    // ==========================================================================
    // Input Validation
    // ==========================================================================

    // Validate required fields
    if (!body.battle_id || !body.agent_id || !body.amount_sol || !body.wallet_address || !body.transaction_signature) {
      return errorResponse('Missing required fields: battle_id, agent_id, amount_sol, wallet_address, transaction_signature', 400, req);
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

    // Validate amount
    if (typeof body.amount_sol !== 'number' || isNaN(body.amount_sol)) {
      return errorResponse('Invalid bet amount', 400, req);
    }

    if (!isValidBetAmount(body.amount_sol, 10)) {
      return errorResponse('Bet amount must be between 0.01 and 10 SOL', 400, req);
    }

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
    // Solana Transaction Verification
    // ==========================================================================

    const txResult = await verifyTransaction(
      body.transaction_signature,
      body.amount_sol,
      body.wallet_address
    );

    if (!txResult.success) {
      return errorResponse(`Transaction verification failed: ${txResult.error}`, 400, req);
    }

    const supabase = getSupabaseClient();

    // Check if transaction was already used (prevent double-spending)
    const txCheck = await checkAndStoreTransaction(
      supabase,
      body.transaction_signature,
      'bet'
    );

    if (txCheck.alreadyUsed) {
      return errorResponse('Transaction has already been used', 400, req);
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

    // Check battle accepts bets (open or just started)
    if (battle.status === 'completed' || battle.status === 'cancelled') {
      return errorResponse('Battle is no longer accepting bets', 400, req);
    }

    // Check if in middle of battle - only allow bets before round 2
    if (battle.status === 'in_progress' && battle.current_round > 1) {
      return errorResponse('Betting closed after round 1', 400, req);
    }

    // Check agent is a participant
    const { data: participant, error: participantError } = await supabase
      .from('battle_royale_participants')
      .select('id')
      .eq('battle_id', body.battle_id)
      .eq('agent_id', body.agent_id)
      .single();

    if (participantError || !participant) {
      return errorResponse('Agent is not a participant in this battle', 400, req);
    }

    // Check user hasn't exceeded bet limit for this battle
    const { data: existingBets, error: betsError } = await supabase
      .from('battle_royale_bets')
      .select('amount_sol')
      .eq('battle_id', body.battle_id)
      .eq('wallet_address', body.wallet_address);

    if (betsError) {
      return errorResponse('Failed to check existing bets', 500, req);
    }

    const totalExisting = existingBets?.reduce((sum, b) => sum + b.amount_sol, 0) || 0;
    if (totalExisting + body.amount_sol > 25) {
      return errorResponse('Maximum total bets per battle is 25 SOL', 400, req);
    }

    // ==========================================================================
    // Place the Bet
    // ==========================================================================

    const { data: bet, error: betError } = await supabase
      .from('battle_royale_bets')
      .insert({
        battle_id: body.battle_id,
        wallet_address: body.wallet_address,
        agent_id: body.agent_id,
        amount_sol: body.amount_sol,
        status: 'pending',
        payout_sol: 0,
        transaction_signature: body.transaction_signature,
      })
      .select()
      .single();

    if (betError) {
      return errorResponse(sanitizeError(betError), 500, req);
    }

    // Calculate current odds
    const { data: allBets } = await supabase
      .from('battle_royale_bets')
      .select('agent_id, amount_sol')
      .eq('battle_id', body.battle_id);

    const totalPool = allBets?.reduce((sum, b) => sum + b.amount_sol, 0) || 0;
    const agentPool = allBets?.filter(b => b.agent_id === body.agent_id)
      .reduce((sum, b) => sum + b.amount_sol, 0) || 0;

    const currentOdds = agentPool > 0 ? totalPool / agentPool : 10;

    return jsonResponse({
      success: true,
      bet_id: bet.id,
      current_odds: Math.min(Math.max(currentOdds, 1.1), 50),
      verified_amount: txResult.amountSol,
      message: `Bet of ${body.amount_sol} SOL placed and verified`,
    }, 200, req);

  } catch (err) {
    return errorResponse('Internal server error', 500, req);
  }
});
