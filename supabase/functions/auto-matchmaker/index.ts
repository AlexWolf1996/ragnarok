/**
 * Auto Matchmaker Edge Function
 * Automatically creates matches/battles when enough agents are in queue
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { ArenaTier, TIER_CONFIG, generateBattleName } from '../_shared/types.ts';

interface MatchmakerRequest {
  tier?: ArenaTier;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: MatchmakerRequest = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();

    const tiersToProcess: ArenaTier[] = body.tier
      ? [body.tier]
      : ['bifrost', 'midgard', 'asgard'];

    const results: Array<{ tier: ArenaTier; matched: number; battles_created: number }> = [];

    for (const tier of tiersToProcess) {
      const tierConfig = TIER_CONFIG[tier];
      let matched = 0;
      let battlesCreated = 0;

      // Get all waiting agents for this tier
      const { data: waitingAgents, error: queueError } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('tier', tier)
        .eq('status', 'waiting')
        .order('queued_at', { ascending: true });

      if (queueError || !waitingAgents) {
        console.error(`Error getting queue for ${tier}:`, queueError);
        continue;
      }

      // Check if we have enough for a duel (2 agents)
      while (waitingAgents.length >= 2) {
        const agent1 = waitingAgents.shift()!;
        const agent2 = waitingAgents.shift()!;

        // Create a match (duel)
        const { data: challenge } = await supabase
          .from('challenges')
          .select('id')
          .limit(1)
          .single();

        if (!challenge) {
          console.error('No challenges available');
          break;
        }

        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            agent_a_id: agent1.agent_id,
            agent_b_id: agent2.agent_id,
            challenge_id: challenge.id,
            status: 'pending',
          })
          .select()
          .single();

        if (matchError) {
          console.error('Error creating match:', matchError);
          continue;
        }

        // Update queue entries
        await supabase
          .from('matchmaking_queue')
          .update({
            status: 'matched',
            matched_with: agent2.agent_id,
            match_id: match.id,
          })
          .eq('id', agent1.id);

        await supabase
          .from('matchmaking_queue')
          .update({
            status: 'matched',
            matched_with: agent1.agent_id,
            match_id: match.id,
          })
          .eq('id', agent2.id);

        // Run the match
        try {
          await supabase.functions.invoke('run-match', {
            body: {
              agent_a_id: agent1.agent_id,
              agent_b_id: agent2.agent_id,
              challenge_id: challenge.id,
            },
          });
        } catch (runError) {
          console.error('Error running match:', runError);
        }

        matched += 2;
      }

      // Check if we have enough for a battle royale (4+ agents)
      // Re-fetch queue as some may have been matched
      const { data: remainingAgents } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .eq('tier', tier)
        .eq('status', 'waiting')
        .order('queued_at', { ascending: true });

      if (remainingAgents && remainingAgents.length >= tierConfig.minAgents) {
        // Create a battle royale
        const battleName = generateBattleName(tier);
        const registrationCloses = new Date();
        registrationCloses.setMinutes(registrationCloses.getMinutes() + 5); // 5 min registration

        const { data: battle, error: battleError } = await supabase
          .from('battle_royales')
          .insert({
            name: battleName,
            tier,
            origin: 'scheduled',
            min_agents: tierConfig.minAgents,
            max_agents: 16,
            buy_in_sol: tierConfig.buyIn,
            payout_structure: 'winner_takes_all',
            platform_fee_pct: tierConfig.platformFeePct,
            num_rounds: 3,
            registration_closes_at: registrationCloses.toISOString(),
            status: 'open',
            current_round: 0,
            participant_count: 0,
            total_pool_sol: 0,
          })
          .select()
          .single();

        if (battleError) {
          console.error('Error creating battle:', battleError);
        } else {
          battlesCreated++;

          // Auto-join the waiting agents to this battle
          for (const queueEntry of remainingAgents.slice(0, 16)) {
            try {
              await supabase.functions.invoke('battle-royale-join', {
                body: {
                  battle_id: battle.id,
                  agent_id: queueEntry.agent_id,
                  wallet_address: 'auto-matchmaker', // Special marker
                },
              });

              // Remove from queue
              await supabase
                .from('matchmaking_queue')
                .update({
                  status: 'matched',
                  match_id: battle.id,
                })
                .eq('id', queueEntry.id);

              matched++;
            } catch (joinError) {
              console.error('Error auto-joining agent:', joinError);
            }
          }
        }
      }

      results.push({ tier, matched, battles_created: battlesCreated });
    }

    // Clean up expired queue entries (older than 30 minutes)
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    await supabase
      .from('matchmaking_queue')
      .update({ status: 'expired' })
      .eq('status', 'waiting')
      .lt('queued_at', thirtyMinutesAgo.toISOString());

    return jsonResponse({
      success: true,
      results,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});
