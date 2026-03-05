/**
 * Execute Battle Royale API
 * POST: Run all rounds, score participants, calculate payouts
 *
 * This is called internally after a battle is started.
 * Each round: generate all responses in parallel, batch-score them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { generateAgentResponse, scoreBatchResponses } from '@/lib/groq/client';
import { verifyCronAuth } from '@/lib/qstash/verify';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Hobby tier limit

interface ParticipantWithAgent {
  id: string;
  agent_id: string;
  round_scores: Array<{ round: number; score: number; time_ms: number; challenge_type?: string }>;
  total_score: number;
  agent: {
    id: string;
    name: string;
    system_prompt: string | null;
    elo_rating: number;
    wallet_address: string | null;
  };
}

export async function POST(request: NextRequest) {
  // Auth: only scheduler/cron can trigger execution
  const authResult = await verifyCronAuth(request);
  if (authResult) return authResult;

  const startTime = Date.now();

  try {
    const body = await request.json();
    const { battle_id } = body;

    if (!battle_id) {
      return NextResponse.json(
        { success: false, error: 'Missing battle_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Acquire exclusive lock on the battle (prevents concurrent execution)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lockedBattles, error: lockError } = await (supabase.rpc as any)(
      'lock_battle_for_execution', { p_battle_id: battle_id }
    );

    if (lockError) {
      console.error('[BR Execute] Lock error:', lockError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to acquire battle lock' },
        { status: 500 }
      );
    }

    const battle = lockedBattles?.[0];
    if (!battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found, not in progress, or already being executed' },
        { status: 409 }
      );
    }

    // Fetch participants with agent details
    const { data: participantsRaw, error: participantsError } = await supabase
      .from('battle_royale_participants')
      .select(`
        id, agent_id, round_scores, total_score,
        agent:agents(id, name, system_prompt, elo_rating, wallet_address)
      `)
      .eq('battle_id', battle_id);

    if (participantsError || !participantsRaw || participantsRaw.length < 2) {
      await markBattleFailed(supabase, battle_id, 'Not enough participants');
      return NextResponse.json(
        { success: false, error: 'Not enough participants' },
        { status: 400 }
      );
    }

    const participants = participantsRaw as unknown as ParticipantWithAgent[];

    // Fetch rounds with challenges
    const { data: rounds, error: roundsError } = await supabase
      .from('battle_royale_rounds')
      .select(`
        id, round_number, challenge_id, status,
        challenge:challenges(id, name, type, prompt, expected_output, difficulty)
      `)
      .eq('battle_id', battle_id)
      .order('round_number', { ascending: true });

    if (roundsError || !rounds || rounds.length === 0) {
      await markBattleFailed(supabase, battle_id, 'No rounds found');
      return NextResponse.json(
        { success: false, error: 'No rounds found' },
        { status: 500 }
      );
    }

    console.log(`[BR Execute] Starting battle "${battle.name}" with ${participants.length} participants, ${rounds.length} rounds`);

    // Process each round
    for (const round of rounds) {
      // Timeout check: if approaching Vercel limit, fail gracefully
      const elapsed = Date.now() - startTime;
      if (elapsed > 50_000) {
        await markBattleFailed(supabase, battle_id, 'Execution timed out');
        return NextResponse.json(
          { success: false, error: 'Battle execution timed out' },
          { status: 504 }
        );
      }

      const challenge = round.challenge as unknown as {
        id: string;
        name: string;
        type: string;
        prompt: unknown;
        expected_output: unknown;
        difficulty: string;
      };

      if (!challenge) {
        console.error(`[BR Execute] Round ${round.round_number} has no challenge`);
        continue;
      }

      // Mark round as in_progress
      await supabase
        .from('battle_royale_rounds')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', round.id);

      // Update current round on battle
      await supabase
        .from('battle_royales')
        .update({ current_round: round.round_number })
        .eq('id', battle_id);

      // Extract prompt text
      const promptText = typeof challenge.prompt === 'object'
        ? (challenge.prompt as Record<string, unknown>).question ||
          (challenge.prompt as Record<string, unknown>).prompt ||
          JSON.stringify(challenge.prompt)
        : String(challenge.prompt);

      console.log(`[BR Execute] Round ${round.round_number}: ${challenge.name} (${challenge.type})`);

      // Generate all responses in parallel
      const responsePromises = participants.map(async (p) => {
        const startMs = Date.now();
        try {
          const response = await generateAgentResponse(
            p.agent.name,
            p.agent.system_prompt,
            promptText as string
          );
          return {
            participantId: p.id,
            agentName: p.agent.name,
            response: response || '(empty response)',
            timeMs: Date.now() - startMs,
          };
        } catch (err) {
          console.error(`[BR Execute] Agent ${p.agent.name} failed:`, err);
          return {
            participantId: p.id,
            agentName: p.agent.name,
            response: '(failed to generate response)',
            timeMs: Date.now() - startMs,
          };
        }
      });

      const responses = await Promise.all(responsePromises);
      console.log(`[BR Execute] Round ${round.round_number}: ${responses.length} responses generated`);

      // Batch-score all responses
      const scores = await scoreBatchResponses(
        {
          name: challenge.name,
          type: challenge.type,
          prompt: challenge.prompt,
          expectedOutput: challenge.expected_output,
        },
        responses.map(r => ({ agentName: r.agentName, response: r.response }))
      );

      console.log(`[BR Execute] Round ${round.round_number} scores:`, scores.map(s => `${s.agentName}=${s.score}`).join(', '));

      // Update participant scores
      for (const response of responses) {
        const scoreResult = scores.find(s => s.agentName === response.agentName);
        const score = scoreResult?.score || 0;

        const participant = participants.find(p => p.id === response.participantId)!;
        const newRoundScores = [
          ...participant.round_scores,
          {
            round: round.round_number,
            score,
            time_ms: response.timeMs,
            challenge_type: challenge.type,
          },
        ];
        const newTotalScore = newRoundScores.reduce((sum, rs) => sum + rs.score, 0);

        // Update in DB
        await supabase
          .from('battle_royale_participants')
          .update({
            round_scores: newRoundScores,
            total_score: newTotalScore,
          })
          .eq('id', participant.id);

        // Update local state for next round
        participant.round_scores = newRoundScores;
        participant.total_score = newTotalScore;
      }

      // Mark round completed
      await supabase
        .from('battle_royale_rounds')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', round.id);
    }

    // Calculate final rankings
    const ranked = [...participants].sort((a, b) => b.total_score - a.total_score);

    // Calculate payouts
    const totalPool = battle.total_pool_sol || 0;
    const platformFee = totalPool * ((battle.platform_fee_pct || 5) / 100);
    const netPool = totalPool - platformFee;

    const payouts: Record<number, number> = {};
    if (battle.payout_structure === 'top_three') {
      payouts[1] = netPool * 0.6;
      payouts[2] = netPool * 0.25;
      payouts[3] = netPool * 0.15;
    } else {
      payouts[1] = netPool;
    }

    // Update participants with final ranks and payouts
    const results: Array<{ rank: number; agent_id: string; agent_name: string; total_score: number; payout_sol: number }> = [];

    for (let i = 0; i < ranked.length; i++) {
      const rank = i + 1;
      const payout = payouts[rank] || 0;

      await supabase
        .from('battle_royale_participants')
        .update({ final_rank: rank, payout_sol: payout })
        .eq('id', ranked[i].id);

      results.push({
        rank,
        agent_id: ranked[i].agent_id,
        agent_name: ranked[i].agent.name,
        total_score: ranked[i].total_score,
        payout_sol: payout,
      });
    }

    // Update battle to completed
    const winnerId = ranked[0]?.agent_id || null;
    const secondId = ranked[1]?.agent_id || null;
    const thirdId = ranked[2]?.agent_id || null;

    await supabase
      .from('battle_royales')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        winner_id: winnerId,
        second_place_id: secondId,
        third_place_id: thirdId,
      })
      .eq('id', battle_id);

    // Update winner's ELO (bonus for winning BR)
    if (winnerId) {
      const winner = ranked[0];
      const eloBonus = 25 + (participants.length * 2);
      await supabase.rpc('update_agent_battle_stats', {
        p_agent_id: winnerId,
        p_new_elo: winner.agent.elo_rating + eloBonus,
        p_is_winner: true,
      });
    }

    // Settle spectator bets (parimutuel)
    if (winnerId) {
      const { data: allBets } = await supabase
        .from('battle_royale_bets')
        .select('id, wallet_address, agent_id, amount_sol')
        .eq('battle_id', battle_id)
        .eq('status', 'pending');

      if (allBets && allBets.length > 0) {
        const totalBetPool = allBets.reduce((sum, b) => sum + Number(b.amount_sol), 0);
        const rake = totalBetPool * 0.05;
        const netBetPool = totalBetPool - rake;
        const winningBets = allBets.filter(b => b.agent_id === winnerId);
        const winningPool = winningBets.reduce((sum, b) => sum + Number(b.amount_sol), 0);

        // Mark winning bets and queue payouts
        for (const bet of winningBets) {
          const betPayout = winningPool > 0
            ? (Number(bet.amount_sol) / winningPool) * netBetPool
            : 0;

          await supabase
            .from('battle_royale_bets')
            .update({ status: 'won', payout_sol: betPayout })
            .eq('id', bet.id);

          if (betPayout > 0) {
            await supabase.from('payout_queue').insert({
              battle_royale_id: battle_id,
              wallet_address: bet.wallet_address,
              amount_sol: betPayout,
              status: 'pending',
            });

            await supabase.from('notifications').insert({
              wallet_address: bet.wallet_address,
              type: 'payout_completed',
              title: 'Bet Won!',
              message: `Your bet on the Battle Royale winner paid out ${betPayout.toFixed(4)} SOL!`,
            });
          }
        }

        // Mark losing bets and send loss notifications
        const losingBets = allBets.filter(b => b.agent_id !== winnerId);
        for (const bet of losingBets) {
          await supabase
            .from('battle_royale_bets')
            .update({ status: 'lost' })
            .eq('id', bet.id);

          await supabase.from('notifications').insert({
            wallet_address: bet.wallet_address,
            type: 'match_result',
            title: 'Battle Royale Result',
            message: 'Your prediction was defeated. Better luck next battle.',
          });
        }

        console.log(`[BR Execute] Settled ${allBets.length} spectator bets (${winningBets.length} winners, ${losingBets.length} losers)`);
      }
    }

    // Queue SOL payouts for winners (processed by existing payout_queue processor)
    for (const result of results) {
      if (result.payout_sol > 0) {
        const winner = ranked.find(p => p.agent_id === result.agent_id);
        const walletAddress = winner?.agent.wallet_address;

        if (walletAddress) {
          const { error: queueError } = await supabase
            .from('payout_queue')
            .insert({
              battle_royale_id: battle_id,
              wallet_address: walletAddress,
              amount_sol: result.payout_sol,
              status: 'pending',
            });

          if (queueError) {
            console.error(`[BR Execute] Failed to queue payout for ${walletAddress}:`, queueError.message);
          } else {
            console.log(`[BR Execute] Payout queued for ${walletAddress}: ${result.payout_sol} SOL`);
          }

          // Notification: payout queued
          await supabase.from('notifications').insert({
            wallet_address: walletAddress,
            type: 'payout_completed',
            title: 'Battle Royale Victory!',
            message: `Your agent placed #${result.rank} and won ${result.payout_sol} SOL!`,
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[BR Execute] Battle "${battle.name}" completed in ${duration}ms. Winner: ${ranked[0]?.agent.name}`);

    return NextResponse.json({
      success: true,
      message: 'Battle completed',
      winner_id: winnerId,
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    console.error('[BR Execute] Error:', error);

    // Try to refund on unexpected failure
    try {
      const body = await request.clone().json().catch(() => null);
      if (body?.battle_id) {
        const supabase = getSupabaseAdmin();
        await markBattleFailed(supabase, body.battle_id, error instanceof Error ? error.message : 'Execution failed');
      }
    } catch (refundErr) {
      console.error('[BR Execute] Failed to refund after error:', refundErr);
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    );
  }
}

async function markBattleFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  battleId: string,
  reason: string
) {
  try {
    // Mark battle as cancelled
    await supabase
      .from('battle_royales')
      .update({ status: 'cancelled' })
      .eq('id', battleId);
    console.error(`[BR Execute] Battle ${battleId} cancelled: ${reason}`);

    // Refund participants via payout_queue
    const { data: participants } = await supabase
      .from('battle_royale_participants')
      .select('agent_id')
      .eq('battle_id', battleId);

    const { data: battle } = await supabase
      .from('battle_royales')
      .select('buy_in_sol')
      .eq('id', battleId)
      .single();

    if (participants && battle) {
      for (const p of participants) {
        // Get agent wallet
        const { data: agent } = await supabase
          .from('agents')
          .select('wallet_address')
          .eq('id', p.agent_id)
          .single();

        if (agent?.wallet_address) {
          await supabase.from('payout_queue').insert({
            battle_royale_id: battleId,
            wallet_address: agent.wallet_address,
            amount_sol: battle.buy_in_sol,
            status: 'pending',
          });

          await supabase.from('notifications').insert({
            wallet_address: agent.wallet_address,
            type: 'match_result',
            title: 'Battle Cancelled — Refund Issued',
            message: `Battle Royale was cancelled: ${reason}. Your ${battle.buy_in_sol} SOL buy-in will be refunded.`,
          });
        }
      }
      console.log(`[BR Execute] Queued refunds for ${participants.length} participants`);
    }

    // Refund pending spectator bets via payout_queue
    const { data: pendingBets } = await supabase
      .from('battle_royale_bets')
      .select('id, wallet_address, amount_sol')
      .eq('battle_id', battleId)
      .eq('status', 'pending');

    if (pendingBets && pendingBets.length > 0) {
      for (const bet of pendingBets) {
        await supabase
          .from('battle_royale_bets')
          .update({ status: 'refunded', payout_sol: bet.amount_sol })
          .eq('id', bet.id);

        await supabase.from('payout_queue').insert({
          battle_royale_id: battleId,
          wallet_address: bet.wallet_address,
          amount_sol: bet.amount_sol,
          status: 'pending',
        });

        await supabase.from('notifications').insert({
          wallet_address: bet.wallet_address,
          type: 'match_result',
          title: 'Bet Refunded — Battle Cancelled',
          message: `Battle Royale was cancelled. Your ${bet.amount_sol} SOL bet will be refunded.`,
        });
      }
      console.log(`[BR Execute] Queued refunds for ${pendingBets.length} spectator bets`);
    }
  } catch (err) {
    console.error(`[BR Execute] Failed to cancel/refund battle:`, err);
  }
}
