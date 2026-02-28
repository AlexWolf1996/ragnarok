/**
 * Auto-Scheduler Cron Job
 *
 * The core game loop: schedules matches, manages betting windows,
 * starts battles, and queues the next match.
 *
 * Triggered every minute via QStash, or daily via Vercel cron (fallback).
 * Uses scheduler_lock table to prevent concurrent execution.
 *
 * GET|POST /api/cron/scheduler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { executeBattle } from '@/lib/battles/engine';
import { selectMatchup } from '@/lib/matchmaking';
import { settleMatch } from '@/lib/bets/parimutuel';
import { processPayoutQueue } from '@/lib/payouts/processor';
import { verifyCronAuth } from '@/lib/qstash/verify';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Timing constants (in milliseconds)
const BETTING_WINDOW_MS = 10 * 60 * 1000;  // 10 min betting window
const MATCH_INTERVAL_MS = 30 * 60 * 1000;  // 30 min between matches
const STUCK_IN_PROGRESS_MS = 5 * 60 * 1000; // Force-complete after 5 min
const STUCK_BETTING_MS = 15 * 60 * 1000;    // Force-start after 15 min
const LOCK_TIMEOUT_S = 50; // Lock expires after 50 seconds

async function handler(request: NextRequest) {
  // Verify auth: QStash signature OR CRON_SECRET
  const authError = await verifyCronAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();

  // Acquire lock (prevents concurrent execution)
  const { data: lockResult, error: lockError } = await supabase
    .from('scheduler_lock')
    .update({ locked_at: new Date().toISOString(), locked_by: 'cron' })
    .eq('id', 1)
    .lt('locked_at', new Date(Date.now() - LOCK_TIMEOUT_S * 1000).toISOString())
    .select();

  if (lockError || !lockResult || lockResult.length === 0) {
    console.log('[Scheduler] Lock not acquired — another instance is running');
    return NextResponse.json({ success: true, action: 'skipped', reason: 'locked' });
  }

  try {
    const now = new Date();
    const actions: string[] = [];

    // 1. Check for stuck matches
    // Stuck in_progress > 5 min → force complete (mark as failed)
    const { data: stuckInProgress } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'in_progress')
      .lt('started_at', new Date(now.getTime() - STUCK_IN_PROGRESS_MS).toISOString());

    for (const match of (stuckInProgress || [])) {
      await supabase
        .from('matches')
        .update({ status: 'failed', completed_at: now.toISOString() })
        .eq('id', match.id);
      actions.push(`force-failed stuck match ${match.id}`);
    }

    // Stuck betting_open > 15 min → force start
    const { data: stuckBetting } = await supabase
      .from('matches')
      .select('id, agent_a_id, agent_b_id, challenge_id')
      .eq('status', 'betting_open')
      .lt('betting_opens_at', new Date(now.getTime() - STUCK_BETTING_MS).toISOString());

    for (const match of (stuckBetting || [])) {
      await startBattle(supabase, match);
      actions.push(`force-started stuck betting match ${match.id}`);
    }

    // 2. Check for matches where betting window expired → start battle
    const { data: readyMatches } = await supabase
      .from('matches')
      .select('id, agent_a_id, agent_b_id, challenge_id, starts_at')
      .eq('status', 'betting_open')
      .lte('starts_at', now.toISOString());

    for (const match of (readyMatches || [])) {
      await startBattle(supabase, match);
      actions.push(`started battle for match ${match.id}`);
    }

    // 3. Process pending payouts
    const payoutResult = await processPayoutQueue();
    if (payoutResult.processed > 0) {
      actions.push(`processed ${payoutResult.processed} payouts`);
    }

    // 4. Need a new match? Check if there's any active match
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('id, status')
      .in('status', ['scheduled', 'betting_open', 'in_progress', 'judging'] as const)
      .limit(1);

    if (!activeMatches || activeMatches.length === 0) {
      // No active match — create one
      try {
        const matchup = await selectMatchup();
        const startsAt = new Date(now.getTime() + BETTING_WINDOW_MS);

        // Pick a challenge: 70% user-submitted, 30% system
        let challengeId: string | undefined;
        const useUserChallenge = Math.random() < 0.7;

        if (useUserChallenge) {
          // Try user-submitted challenge first
          const { data: userChallenges } = await supabase
            .from('submitted_challenges')
            .select('id, challenge_text')
            .eq('category', matchup.category.toLowerCase())
            .eq('status', 'approved')
            .order('times_used', { ascending: true })
            .limit(10);

          if (userChallenges && userChallenges.length > 0) {
            const picked = userChallenges[Math.floor(Math.random() * userChallenges.length)];
            // Find or create a challenges table entry for this user challenge
            const { data: existing } = await supabase
              .from('challenges')
              .select('id')
              .eq('name', picked.challenge_text.substring(0, 80))
              .limit(1);

            if (existing && existing.length > 0) {
              challengeId = existing[0].id;
            } else {
              const { data: created } = await supabase
                .from('challenges')
                .insert({
                  name: picked.challenge_text.substring(0, 80),
                  type: matchup.category.toLowerCase(),
                  prompt: { question: picked.challenge_text },
                  expected_output: {},
                  difficulty: 'medium',
                })
                .select('id')
                .single();
              if (created) challengeId = created.id;
            }

            // Increment times_used
            await supabase
              .from('submitted_challenges')
              .update({ times_used: (picked as { times_used?: number }).times_used || 0 + 1 })
              .eq('id', picked.id);
          }
        }

        // Fallback to system challenges
        if (!challengeId) {
          const { data: challenges } = await supabase
            .from('challenges')
            .select('id')
            .eq('type', matchup.category.toLowerCase());

          if (challenges && challenges.length > 0) {
            challengeId = challenges[Math.floor(Math.random() * challenges.length)].id;
          } else {
            const { data: anyChallenges } = await supabase
              .from('challenges')
              .select('id')
              .limit(100);
            if (anyChallenges && anyChallenges.length > 0) {
              challengeId = anyChallenges[Math.floor(Math.random() * anyChallenges.length)].id;
            }
          }
        }

        if (!challengeId) {
          actions.push('no challenges available — skipping match creation');
        } else {
          const { data: newMatch, error: createError } = await supabase
            .from('matches')
            .insert({
              agent_a_id: matchup.agentA.id,
              agent_b_id: matchup.agentB.id,
              challenge_id: challengeId,
              status: 'betting_open',
              category: matchup.category,
              scheduled_at: now.toISOString(),
              betting_opens_at: now.toISOString(),
              starts_at: startsAt.toISOString(),
            })
            .select('id')
            .single();

          if (createError) {
            console.error('[Scheduler] Failed to create match:', createError.message);
            actions.push(`match creation failed: ${createError.message}`);
          } else {
            actions.push(`created match ${newMatch.id}: ${matchup.agentA.name} vs ${matchup.agentB.name} (${matchup.category}), starts at ${startsAt.toISOString()}`);
          }
        }
      } catch (matchupErr) {
        const msg = matchupErr instanceof Error ? matchupErr.message : 'Unknown error';
        console.error('[Scheduler] Matchup error:', msg);
        actions.push(`matchup failed: ${msg}`);
      }
    } else {
      actions.push(`active match exists (${activeMatches[0].status}), no new match needed`);
    }

    console.log(`[Scheduler] Completed: ${actions.join('; ')}`);

    return NextResponse.json({
      success: true,
      actions,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Scheduler] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// GET: Vercel cron fallback | POST: QStash trigger
export const GET = handler;
export const POST = handler;

/**
 * Start a battle for a match: update status, execute, settle.
 */
async function startBattle(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  match: { id: string; agent_a_id: string; agent_b_id: string; challenge_id: string },
) {
  // Update status to in_progress
  await supabase
    .from('matches')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .eq('id', match.id);

  try {
    // Execute the battle
    const result = await executeBattle(match.agent_a_id, match.agent_b_id, match.challenge_id);

    // Settle bets (if any)
    if (result.winner?.id) {
      try {
        await settleMatch(match.id, result.winner.id);
      } catch (settleErr) {
        console.error(`[Scheduler] Settlement error for match ${match.id}:`, settleErr);
      }
    }

    // Schedule next match
    const nextStartsAt = new Date(Date.now() + MATCH_INTERVAL_MS);
    const nextBettingOpensAt = new Date(Date.now() + MATCH_INTERVAL_MS - BETTING_WINDOW_MS);

    console.log(`[Scheduler] Match ${match.id} completed. Next match starts at ${nextStartsAt.toISOString()}`);
  } catch (battleErr) {
    console.error(`[Scheduler] Battle error for match ${match.id}:`, battleErr);
    await supabase
      .from('matches')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', match.id);
  }
}
