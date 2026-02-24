/**
 * Create Battle Royale Edge Function
 * Creates a new custom battle royale
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { ArenaTier, PayoutType, TIER_CONFIG, generateBattleName } from '../_shared/types.ts';

interface CreateBattleRequest {
  name?: string;
  tier: ArenaTier;
  buy_in_sol?: number;
  max_agents?: number | null;
  num_rounds?: number;
  payout_structure?: PayoutType;
  registration_minutes?: number;
  wallet_address: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: CreateBattleRequest = await req.json();

    // Validate required fields
    if (!body.tier || !body.wallet_address) {
      return errorResponse('Missing required fields: tier, wallet_address');
    }

    // Validate tier
    if (!['bifrost', 'midgard', 'asgard'].includes(body.tier)) {
      return errorResponse('Invalid tier. Must be bifrost, midgard, or asgard');
    }

    const tierConfig = TIER_CONFIG[body.tier];
    const supabase = getSupabaseClient();

    // Set defaults
    const buyIn = body.buy_in_sol ?? tierConfig.buyIn;
    const numRounds = body.num_rounds ?? 3;
    const payoutStructure = body.payout_structure ?? 'winner_takes_all';
    const registrationMinutes = body.registration_minutes ?? 30;
    const name = body.name ?? generateBattleName(body.tier);

    // Validate buy-in matches tier minimum
    if (buyIn < tierConfig.buyIn) {
      return errorResponse(`Buy-in must be at least ${tierConfig.buyIn} SOL for ${body.tier} tier`);
    }

    // Calculate registration close time
    const registrationClosesAt = new Date();
    registrationClosesAt.setMinutes(registrationClosesAt.getMinutes() + registrationMinutes);

    // Create the battle
    const { data: battle, error } = await supabase
      .from('battle_royales')
      .insert({
        name,
        tier: body.tier,
        origin: 'custom',
        min_agents: tierConfig.minAgents,
        max_agents: body.max_agents ?? null,
        buy_in_sol: buyIn,
        payout_structure: payoutStructure,
        platform_fee_pct: tierConfig.platformFeePct,
        num_rounds: numRounds,
        registration_closes_at: registrationClosesAt.toISOString(),
        status: 'open',
        current_round: 0,
        participant_count: 0,
        total_pool_sol: 0,
        created_by_wallet: body.wallet_address,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating battle:', error);
      return errorResponse('Failed to create battle: ' + error.message);
    }

    return jsonResponse({
      success: true,
      battle_id: battle.id,
      message: `Battle "${name}" created successfully`,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});
