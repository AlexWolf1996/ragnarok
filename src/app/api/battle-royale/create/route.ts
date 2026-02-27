/**
 * Create Battle Royale API
 * POST: Create a new battle royale arena
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { TIER_CONFIG, ArenaTier, PayoutType } from '@/types/battleRoyale';
import { isValidWalletAddress } from '@/lib/validation';

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

    // Validate tier
    if (!['bifrost', 'midgard', 'asgard'].includes(tier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
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
