/**
 * Start Battle Royale API
 * POST: Transition battle from 'open' to 'in_progress', create rounds, trigger execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { TIER_CONFIG, ArenaTier } from '@/types/battleRoyale';
import { verifyCronAuth } from '@/lib/qstash/verify';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Auth: cron passes CRON_SECRET, users pass wallet_address
    const cronAuth = await verifyCronAuth(request);
    const isCronAuthed = cronAuth === null;

    const body = await request.json();
    const { battle_id, wallet_address } = body;

    if (!battle_id) {
      return NextResponse.json(
        { success: false, error: 'Missing battle_id' },
        { status: 400 }
      );
    }

    // If not cron-authed, require wallet_address and rate limit
    if (!isCronAuthed) {
      if (!wallet_address) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const rateCheck = await checkRateLimit(`br-start:${wallet_address}`, 5);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded', retryAfterMs: rateCheck.retryAfterMs },
          { status: 429 }
        );
      }
    }

    const supabase = getSupabaseAdmin();

    // Acquire exclusive lock on the battle (prevents concurrent start)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lockedBattles, error: lockError } = await (supabase.rpc as any)(
      'lock_battle_for_start', { p_battle_id: battle_id }
    );

    if (lockError) {
      console.error('[BR Start] Lock error:', lockError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to acquire battle lock' },
        { status: 500 }
      );
    }

    const battle = lockedBattles?.[0];
    if (!battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found, not open, or already being started' },
        { status: 409 }
      );
    }

    // Access control: creator can start anytime, others only after registration closes
    const isCreator = wallet_address && battle.created_by_wallet === wallet_address;
    const registrationClosed = new Date(battle.registration_closes_at) <= new Date();

    if (!isCreator && !registrationClosed) {
      return NextResponse.json(
        { success: false, error: 'Only the battle creator can start before registration closes' },
        { status: 403 }
      );
    }

    // Check minimum participants
    const tierConfig = TIER_CONFIG[battle.tier as ArenaTier];
    if (battle.participant_count < tierConfig.minAgents) {
      // Not enough participants, cancel the battle
      await supabase
        .from('battle_royales')
        .update({ status: 'cancelled' })
        .eq('id', battle_id);

      return NextResponse.json(
        {
          success: false,
          error: `Not enough participants (${battle.participant_count}/${tierConfig.minAgents} minimum). Battle cancelled.`,
        },
        { status: 400 }
      );
    }

    // Get random challenges for the rounds
    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select('id');

    if (challengeError || !challenges || challenges.length < battle.num_rounds) {
      return NextResponse.json(
        { success: false, error: 'Not enough challenges available' },
        { status: 500 }
      );
    }

    // Shuffle and pick num_rounds challenges
    const shuffled = challenges.sort(() => Math.random() - 0.5);
    const selectedChallenges = shuffled.slice(0, battle.num_rounds);

    // Create rounds
    const rounds = selectedChallenges.map((c, i) => ({
      battle_id,
      round_number: i + 1,
      challenge_id: c.id,
      status: 'pending' as const,
    }));

    const { error: roundsError } = await supabase
      .from('battle_royale_rounds')
      .insert(rounds);

    if (roundsError) {
      console.error('[BR Start] Failed to create rounds:', roundsError);
      return NextResponse.json(
        { success: false, error: 'Failed to create battle rounds' },
        { status: 500 }
      );
    }

    // Update battle to in_progress
    await supabase
      .from('battle_royales')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        current_round: 1,
      })
      .eq('id', battle_id);

    console.log(`[BR Start] Battle ${battle.name} started with ${battle.participant_count} participants and ${battle.num_rounds} rounds`);

    // Trigger execution asynchronously (fire-and-forget)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'http://localhost:3000'
        : 'http://localhost:3000';

    fetch(`${baseUrl}/api/battle-royale/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      body: JSON.stringify({ battle_id }),
    }).catch(err => {
      console.error('[BR Start] Failed to trigger execution:', err);
    });

    return NextResponse.json({
      success: true,
      message: `Battle "${battle.name}" has begun!`,
      num_rounds: battle.num_rounds,
      participant_count: battle.participant_count,
    });
  } catch (error) {
    console.error('[BR Start] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
