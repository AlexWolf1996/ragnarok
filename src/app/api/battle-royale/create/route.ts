/**
 * Create Battle Royale API
 * POST: Create a new battle royale arena
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { TIER_CONFIG, ArenaTier, PayoutType } from '@/types/battleRoyale';
import { isValidWalletAddress } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const BATTLE_NAMES = [
  'Twilight of the Gods',
  'Clash of Titans',
  'Ragnarok Rising',
  'Valhalla Showdown',
  'The Allfather\'s Trial',
  'Bifrost Brawl',
  'Asgard Assault',
  'Odin\'s Challenge',
  'Fenrir\'s Fury',
  'Mjolnir Mayhem',
];

function generateBattleName(): string {
  const name = BATTLE_NAMES[Math.floor(Math.random() * BATTLE_NAMES.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${name} #${num}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      tier,
      buy_in_sol,
      max_agents,
      num_rounds = 3,
      payout_structure = 'winner_takes_all',
      registration_minutes = 30,
      wallet_address,
    } = body;

    // Validate required fields
    if (!tier || !wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tier, wallet_address' },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!isValidWalletAddress(wallet_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Rate limit: 3 creates/wallet/minute
    const rateCheck = await checkRateLimit(`br-create:${wallet_address}`, 3);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded', retryAfterMs: rateCheck.retryAfterMs },
        { status: 429 }
      );
    }

    // Validate tier
    if (!['bifrost', 'midgard', 'asgard'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Validate num_rounds: must be 3, 5, or 7
    if (![3, 5, 7].includes(num_rounds)) {
      return NextResponse.json(
        { success: false, error: 'num_rounds must be 3, 5, or 7' },
        { status: 400 }
      );
    }

    // Validate registration_minutes: 5-60 range
    if (registration_minutes < 5 || registration_minutes > 60) {
      return NextResponse.json(
        { success: false, error: 'registration_minutes must be between 5 and 60' },
        { status: 400 }
      );
    }

    // Validate max_agents: must be between tier min and 20
    const tierMinAgents = TIER_CONFIG[tier as ArenaTier].minAgents;
    if (max_agents !== undefined && max_agents !== null) {
      if (max_agents < tierMinAgents || max_agents > 20) {
        return NextResponse.json(
          { success: false, error: `max_agents must be between ${tierMinAgents} and 20` },
          { status: 400 }
        );
      }
    }

    // Validate payout_structure
    if (!['winner_takes_all', 'top_three'].includes(payout_structure)) {
      return NextResponse.json(
        { success: false, error: 'payout_structure must be winner_takes_all or top_three' },
        { status: 400 }
      );
    }

    const tierConfig = TIER_CONFIG[tier as ArenaTier];
    const buyIn = buy_in_sol || tierConfig.buyIn;
    const battleName = name || generateBattleName();

    // Calculate registration close time
    const registrationCloses = new Date(
      Date.now() + registration_minutes * 60 * 1000
    ).toISOString();

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('battle_royales')
      .insert({
        name: battleName,
        tier: tier as ArenaTier,
        origin: 'custom' as const,
        min_agents: tierConfig.minAgents,
        max_agents: max_agents || null,
        buy_in_sol: buyIn,
        payout_structure: payout_structure as PayoutType,
        platform_fee_pct: tierConfig.platformFeePct,
        num_rounds,
        registration_closes_at: registrationCloses,
        status: 'open',
        current_round: 0,
        participant_count: 0,
        total_pool_sol: 0,
        created_by_wallet: wallet_address,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[BR Create] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create battle' },
        { status: 500 }
      );
    }

    console.log(`[BR Create] Battle created: ${data.id} - ${battleName}`);

    return NextResponse.json({
      success: true,
      battle_id: data.id,
      message: `Battle "${battleName}" created successfully`,
    });
  } catch (error) {
    console.error('[BR Create] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
