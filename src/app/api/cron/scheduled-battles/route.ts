/**
 * Scheduled Battles CRON Route
 * Checks for scheduled events and creates battle royales.
 * Also auto-starts battles whose registration has closed.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { TIER_CONFIG } from '@/types/battleRoyale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATTLE_NAMES = [
  'Twilight of the Gods',
  'Ragnarok Rising',
  'Valhalla Showdown',
  'The Allfather\'s Trial',
  'Odin\'s Challenge',
  'Fenrir\'s Fury',
];

export async function GET(request: Request) {
  // Verify CRON secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const results: string[] = [];
    const now = new Date();

    // 1. Auto-start battles whose registration has closed and have enough participants
    const { data: readyBattles } = await supabase
      .from('battle_royales')
      .select('id, name, tier, participant_count, min_agents')
      .eq('status', 'open')
      .lt('registration_closes_at', now.toISOString());

    if (readyBattles && readyBattles.length > 0) {
      for (const battle of readyBattles) {
        if (battle.participant_count >= battle.min_agents) {
          // Start the battle via API
          const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

          try {
            const res = await fetch(`${baseUrl}/api/battle-royale/start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
              },
              body: JSON.stringify({ battle_id: battle.id }),
            });
            const data = await res.json();
            results.push(`Started: ${battle.name} (${data.success ? 'ok' : data.error})`);
          } catch (err) {
            results.push(`Failed to start ${battle.name}: ${err instanceof Error ? err.message : 'error'}`);
          }
        } else {
          // Not enough participants, cancel
          await supabase
            .from('battle_royales')
            .update({ status: 'cancelled' })
            .eq('id', battle.id);
          results.push(`Cancelled: ${battle.name} (${battle.participant_count}/${battle.min_agents} participants)`);
        }
      }
    }

    // 2. Detect and cancel stuck BR battles (in_progress > 10 minutes)
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const { data: stuckBattles } = await supabase
      .from('battle_royales')
      .select('id, name, buy_in_sol')
      .eq('status', 'in_progress')
      .lt('started_at', tenMinAgo);

    if (stuckBattles && stuckBattles.length > 0) {
      for (const stuck of stuckBattles) {
        // Cancel the battle
        await supabase
          .from('battle_royales')
          .update({ status: 'cancelled' })
          .eq('id', stuck.id);

        // Refund participants
        const { data: participants } = await supabase
          .from('battle_royale_participants')
          .select('agent_id')
          .eq('battle_id', stuck.id);

        if (participants) {
          for (const p of participants) {
            const { data: agent } = await supabase
              .from('agents')
              .select('wallet_address')
              .eq('id', p.agent_id)
              .single();

            if (agent?.wallet_address) {
              await supabase.from('payout_queue').insert({
                battle_royale_id: stuck.id,
                wallet_address: agent.wallet_address,
                amount_sol: stuck.buy_in_sol,
                status: 'pending',
              });

              await supabase.from('notifications').insert({
                wallet_address: agent.wallet_address,
                type: 'match_result',
                title: 'Battle Cancelled — Refund Issued',
                message: `Battle "${stuck.name}" timed out. Your ${stuck.buy_in_sol} SOL buy-in will be refunded.`,
              });
            }
          }
        }

        // Refund pending spectator bets
        const { data: pendingBets } = await supabase
          .from('battle_royale_bets')
          .select('id, wallet_address, amount_sol')
          .eq('battle_id', stuck.id)
          .eq('status', 'pending');

        if (pendingBets) {
          for (const bet of pendingBets) {
            await supabase
              .from('battle_royale_bets')
              .update({ status: 'refunded', payout_sol: bet.amount_sol })
              .eq('id', bet.id);

            await supabase.from('payout_queue').insert({
              battle_royale_id: stuck.id,
              wallet_address: bet.wallet_address,
              amount_sol: bet.amount_sol,
              status: 'pending',
            });

            await supabase.from('notifications').insert({
              wallet_address: bet.wallet_address,
              type: 'match_result',
              title: 'Bet Refunded — Battle Timed Out',
              message: `Battle "${stuck.name}" timed out. Your ${bet.amount_sol} SOL bet will be refunded.`,
            });
          }
        }

        results.push(`Cancelled stuck battle: ${stuck.name} (refunded participants + bets)`);
      }
    }

    // 3. Create a scheduled battle royale if none are currently open
    const { count: openCount } = await supabase
      .from('battle_royales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (!openCount || openCount === 0) {
      // Create a new midgard battle with 30-min registration
      const tierConfig = TIER_CONFIG.midgard;
      const name = `${BATTLE_NAMES[Math.floor(Math.random() * BATTLE_NAMES.length)]} #${Math.floor(Math.random() * 999) + 1}`;
      const regCloses = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

      const { data: newBattle, error: createError } = await supabase
        .from('battle_royales')
        .insert({
          name,
          tier: 'midgard',
          origin: 'scheduled',
          min_agents: tierConfig.minAgents,
          max_agents: null,
          buy_in_sol: tierConfig.buyIn,
          payout_structure: 'winner_takes_all',
          platform_fee_pct: tierConfig.platformFeePct,
          num_rounds: 3,
          registration_closes_at: regCloses,
          status: 'open',
          current_round: 0,
          participant_count: 0,
          total_pool_sol: 0,
        })
        .select('id')
        .single();

      if (createError) {
        results.push(`Failed to create scheduled battle: ${createError.message}`);
      } else {
        results.push(`Created scheduled battle: ${name} (${newBattle?.id})`);
      }
    } else {
      results.push(`${openCount} battle(s) already open, skipping creation`);
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
