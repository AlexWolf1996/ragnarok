/**
 * Scheduled Battles Edge Function
 * Triggers scheduled events and creates battles based on CRON schedule
 * Should be called via Vercel CRON or Supabase scheduled functions
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { ArenaTier, TIER_CONFIG, generateBattleName } from '../_shared/types.ts';

// Parse cron expression to check if it should run now
// Simple implementation - production should use a proper cron library
function shouldRunNow(cronExpression: string): boolean {
  const now = new Date();
  const parts = cronExpression.split(' ');

  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Check minute
  if (minute !== '*' && parseInt(minute) !== now.getMinutes()) {
    return false;
  }

  // Check hour
  if (hour !== '*' && parseInt(hour) !== now.getHours()) {
    return false;
  }

  // Check day of month
  if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== now.getDate()) {
    return false;
  }

  // Check month (0-indexed in JS)
  if (month !== '*' && parseInt(month) !== now.getMonth() + 1) {
    return false;
  }

  // Check day of week (0 = Sunday)
  if (dayOfWeek !== '*' && parseInt(dayOfWeek) !== now.getDay()) {
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const now = new Date();

    // Get all active scheduled events
    const { data: events, error: eventsError } = await supabase
      .from('scheduled_events')
      .select('*')
      .eq('is_active', true);

    if (eventsError) {
      console.error('Error fetching scheduled events:', eventsError);
      return errorResponse('Failed to fetch scheduled events');
    }

    const triggered: string[] = [];
    const created: string[] = [];

    for (const event of events || []) {
      // Check if this event should run now
      if (!shouldRunNow(event.cron_expression)) {
        continue;
      }

      // Check if already triggered recently (within last hour)
      if (event.last_triggered_at) {
        const lastTriggered = new Date(event.last_triggered_at);
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        if (lastTriggered > hourAgo) {
          continue; // Skip - already triggered recently
        }
      }

      triggered.push(event.name);

      // Create the battle
      const tierConfig = TIER_CONFIG[event.tier as ArenaTier];
      const registrationCloses = new Date();
      registrationCloses.setMinutes(
        registrationCloses.getMinutes() + event.registration_window_minutes
      );

      const battleName = `${event.name} - ${generateBattleName(event.tier as ArenaTier)}`;

      const { data: battle, error: battleError } = await supabase
        .from('battle_royales')
        .insert({
          name: battleName,
          tier: event.tier,
          origin: 'scheduled',
          min_agents: event.min_agents || tierConfig.minAgents,
          max_agents: 32,
          buy_in_sol: event.buy_in_sol,
          payout_structure: event.payout_structure,
          platform_fee_pct: tierConfig.platformFeePct,
          num_rounds: event.num_rounds,
          registration_closes_at: registrationCloses.toISOString(),
          status: 'open',
          current_round: 0,
          participant_count: 0,
          total_pool_sol: 0,
        })
        .select()
        .single();

      if (battleError) {
        console.error(`Error creating battle for ${event.name}:`, battleError);
        continue;
      }

      created.push(battle.id);

      // Update last triggered time
      await supabase
        .from('scheduled_events')
        .update({ last_triggered_at: now.toISOString() })
        .eq('id', event.id);
    }

    // Also check for battles that should be auto-started
    // (registration closed but still in 'open' status)
    const { data: pendingBattles, error: pendingError } = await supabase
      .from('battle_royales')
      .select('*')
      .eq('status', 'open')
      .lt('registration_closes_at', now.toISOString());

    if (!pendingError && pendingBattles) {
      for (const battle of pendingBattles) {
        const tierConfig = TIER_CONFIG[battle.tier as ArenaTier];

        if (battle.participant_count >= tierConfig.minAgents) {
          // Start the battle
          try {
            await supabase.functions.invoke('start-battle-royale', {
              body: {
                battle_id: battle.id,
                wallet_address: 'scheduled-auto-start',
              },
            });
          } catch (startError) {
            console.error(`Error auto-starting battle ${battle.id}:`, startError);
          }
        } else {
          // Not enough participants - cancel
          await supabase
            .from('battle_royales')
            .update({ status: 'cancelled' })
            .eq('id', battle.id);

          // TODO: Refund buy-ins
        }
      }
    }

    return jsonResponse({
      success: true,
      triggered_events: triggered,
      created_battles: created,
      auto_started: pendingBattles?.length || 0,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return errorResponse('Internal server error', 500);
  }
});
