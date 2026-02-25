/**
 * Start Battle Royale Edge Function
 * Starts a battle royale (creator only or after registration closes)
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { TIER_CONFIG } from '../_shared/types.ts';

interface StartBattleRequest {
  battle_id: string;
  wallet_address: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: StartBattleRequest = await req.json();

    // Validate required fields
    if (!body.battle_id || !body.wallet_address) {
      return errorResponse('Missing required fields: battle_id, wallet_address');
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
      return errorResponse('Battle has already started or completed');
    }

    // Check creator or registration has closed
    const now = new Date();
    const registrationCloses = new Date(battle.registration_closes_at);
    const isCreator = battle.created_by_wallet === body.wallet_address;
    const registrationClosed = now >= registrationCloses;

    if (!isCreator && !registrationClosed) {
      return errorResponse('Only the battle creator can start before registration closes');
    }

    // Check minimum participants
    const tierConfig = TIER_CONFIG[battle.tier as keyof typeof TIER_CONFIG];
    if (battle.participant_count < tierConfig.minAgents) {
      // Cancel the battle if not enough participants
      await supabase
        .from('battle_royales')
        .update({
          status: 'cancelled',
        })
        .eq('id', body.battle_id);

      return errorResponse(`Not enough participants (minimum: ${tierConfig.minAgents}). Battle cancelled.`);
    }

    // Get random challenges for rounds
    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select('id')
      .limit(battle.num_rounds);

    if (challengeError || !challenges || challenges.length < battle.num_rounds) {
      return errorResponse('Not enough challenges available');
    }

    // Shuffle challenges
    const shuffled = challenges.sort(() => Math.random() - 0.5);

    // Create rounds
    const rounds = [];
    for (let i = 0; i < battle.num_rounds; i++) {
      rounds.push({
        battle_id: body.battle_id,
        round_number: i + 1,
        challenge_id: shuffled[i].id,
        status: i === 0 ? 'pending' : 'pending', // First round will start immediately
      });
    }

    const { error: roundsError } = await supabase
      .from('battle_royale_rounds')
      .insert(rounds);

    if (roundsError) {
      return errorResponse('Failed to create battle rounds');
    }

    // Update battle status
    const { error: updateError } = await supabase
      .from('battle_royales')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        current_round: 1,
      })
      .eq('id', body.battle_id);

    if (updateError) {
      return errorResponse('Failed to start battle');
    }

    // Trigger the actual battle execution
    // This would typically be handled by a separate process
    // For now, we invoke the run-battle-royale function
    try {
      await supabase.functions.invoke('run-battle-royale', {
        body: { battle_id: body.battle_id },
      });
    } catch {
      // Don't fail - the battle is started, runner can be triggered separately
    }

    return jsonResponse({
      success: true,
      message: 'Battle started',
      num_rounds: battle.num_rounds,
      participant_count: battle.participant_count,
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
});
