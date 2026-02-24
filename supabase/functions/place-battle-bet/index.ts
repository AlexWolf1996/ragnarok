/**
 * Place Battle Bet Edge Function
 * Places a spectator bet on a battle royale participant
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';

interface PlaceBetRequest {
  battle_id: string;
  agent_id: string;
  amount_sol: number;
  wallet_address: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PlaceBetRequest = await req.json();

    // Validate required fields
    if (!body.battle_id || !body.agent_id || !body.amount_sol || !body.wallet_address) {
      return errorResponse('Missing required fields');
    }

    // Validate amount
    if (body.amount_sol <= 0) {
      return errorResponse('Bet amount must be positive');
    }

    if (body.amount_sol > 10) {
      return errorResponse('Maximum bet is 10 SOL');
    }

    const supabase = getSupabaseClient();

    // Get the battle
    const { data: battle, error: battleError } = await supabase
      .from('battle_royales')
      .select('*')
      .eq('id', body.battle_id)
      .single();

    if (battleError || !battle) {
      return errorResponse('Battle not found');
    }

    // Check battle accepts bets (open or just started)
    if (battle.status === 'completed' || battle.status === 'cancelled') {
      return errorResponse('Battle is no longer accepting bets');
    }

    // Check if in middle of battle - only allow bets before round 2
    if (battle.status === 'in_progress' && battle.current_round > 1) {
      return errorResponse('Betting closed after round 1');
    }

    // Check agent is a participant
    const { data: participant, error: participantError } = await supabase
      .from('battle_royale_participants')
      .select('id')
      .eq('battle_id', body.battle_id)
      .eq('agent_id', body.agent_id)
      .single();

    if (participantError || !participant) {
      return errorResponse('Agent is not a participant in this battle');
    }

    // Check user hasn't exceeded bet limit for this battle
    const { data: existingBets, error: betsError } = await supabase
      .from('battle_royale_bets')
      .select('amount_sol')
      .eq('battle_id', body.battle_id)
      .eq('wallet_address', body.wallet_address);

    if (betsError) {
      return errorResponse('Failed to check existing bets');
    }

    const totalExisting = existingBets?.reduce((sum, b) => sum + b.amount_sol, 0) || 0;
    if (totalExisting + body.amount_sol > 25) {
      return errorResponse('Maximum total bets per battle is 25 SOL');
    }

    // TODO: Verify Solana transaction for bet amount
    // For now, we trust the client has made the payment

    // Place the bet
    const { data: bet, error: betError } = await supabase
      .from('battle_royale_bets')
      .insert({
        battle_id: body.battle_id,
        wallet_address: body.wallet_address,
        agent_id: body.agent_id,
        amount_sol: body.amount_sol,
        status: 'pending',
        payout_sol: 0,
      })
      .select()
      .single();

    if (betError) {
      console.error('Error placing bet:', betError);
      return errorResponse('Failed to place bet: ' + betError.message);
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
      message: `Bet of ${body.amount_sol} SOL placed`,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});
