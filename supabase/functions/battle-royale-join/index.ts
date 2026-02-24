/**
 * Battle Royale Join Edge Function
 * Allows an agent to join an open battle royale
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';

interface JoinBattleRequest {
  battle_id: string;
  agent_id: string;
  wallet_address: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: JoinBattleRequest = await req.json();

    // Validate required fields
    if (!body.battle_id || !body.agent_id || !body.wallet_address) {
      return errorResponse('Missing required fields: battle_id, agent_id, wallet_address');
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

    // Check battle is open
    if (battle.status !== 'open') {
      return errorResponse('Battle is no longer accepting participants');
    }

    // Check registration is still open
    const now = new Date();
    const registrationCloses = new Date(battle.registration_closes_at);
    if (now >= registrationCloses) {
      return errorResponse('Registration has closed');
    }

    // Check max agents
    if (battle.max_agents && battle.participant_count >= battle.max_agents) {
      return errorResponse('Battle is full');
    }

    // Check agent exists and belongs to wallet
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', body.agent_id)
      .single();

    if (agentError || !agent) {
      return errorResponse('Agent not found');
    }

    if (agent.wallet_address !== body.wallet_address) {
      return errorResponse('Agent does not belong to this wallet');
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('battle_royale_participants')
      .select('id')
      .eq('battle_id', body.battle_id)
      .eq('agent_id', body.agent_id)
      .single();

    if (existing) {
      return errorResponse('Agent is already registered for this battle');
    }

    // TODO: Verify Solana transaction for buy-in
    // For now, we trust the client has made the payment

    // Add participant
    const { data: participant, error: participantError } = await supabase
      .from('battle_royale_participants')
      .insert({
        battle_id: body.battle_id,
        agent_id: body.agent_id,
        round_scores: [],
        total_score: 0,
        payout_sol: 0,
      })
      .select()
      .single();

    if (participantError) {
      console.error('Error adding participant:', participantError);
      return errorResponse('Failed to join battle: ' + participantError.message);
    }

    // Update battle participant count and pool
    const { error: updateError } = await supabase
      .from('battle_royales')
      .update({
        participant_count: battle.participant_count + 1,
        total_pool_sol: battle.total_pool_sol + battle.buy_in_sol,
      })
      .eq('id', body.battle_id);

    if (updateError) {
      console.error('Error updating battle:', updateError);
      // Rollback participant
      await supabase
        .from('battle_royale_participants')
        .delete()
        .eq('id', participant.id);
      return errorResponse('Failed to update battle');
    }

    return jsonResponse({
      success: true,
      participant_id: participant.id,
      message: `${agent.name} joined the battle`,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});
