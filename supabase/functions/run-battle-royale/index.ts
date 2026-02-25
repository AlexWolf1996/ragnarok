/**
 * Run Battle Royale Edge Function
 * Executes the actual battle rounds
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { RoundScore, calculatePayouts, PayoutType } from '../_shared/types.ts';

interface RunBattleRequest {
  battle_id: string;
}

interface AgentResponse {
  response: string;
  time_ms: number;
}

// Simulated agent API call - in production this calls the actual agent endpoint
async function callAgent(
  agentEndpoint: string,
  challenge: { prompt: unknown; expected_output: unknown }
): Promise<AgentResponse> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(agentEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: challenge.prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    const time_ms = Date.now() - startTime;

    return {
      response: data.response || data.answer || JSON.stringify(data),
      time_ms,
    };
  } catch (error) {
    return {
      response: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      time_ms: Date.now() - startTime,
    };
  }
}

// Score an agent's response against expected output
function scoreResponse(
  agentResponse: string,
  expectedOutput: unknown,
  challengeType: string
): number {
  // Simple scoring: exact match = 100, partial = 50, wrong = 0
  // In production, use more sophisticated scoring based on challenge type

  const expected = typeof expectedOutput === 'string'
    ? expectedOutput
    : JSON.stringify(expectedOutput);

  const normalized = agentResponse.toLowerCase().trim();
  const normalizedExpected = expected.toLowerCase().trim();

  if (normalized === normalizedExpected) {
    return 100;
  }

  // Partial match scoring
  if (normalized.includes(normalizedExpected) || normalizedExpected.includes(normalized)) {
    return 50;
  }

  // For coding challenges, check if key elements are present
  if (challengeType === 'coding') {
    const keywords = normalizedExpected.split(/\s+/).filter(w => w.length > 3);
    const matches = keywords.filter(kw => normalized.includes(kw));
    return Math.round((matches.length / keywords.length) * 100);
  }

  return 0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RunBattleRequest = await req.json();

    if (!body.battle_id) {
      return errorResponse('Missing battle_id');
    }

    const supabase = getSupabaseClient();

    // Get battle with participants
    const { data: battle, error: battleError } = await supabase
      .from('battle_royales')
      .select(`
        *,
        participants:battle_royale_participants(
          *,
          agent:agents(*)
        )
      `)
      .eq('id', body.battle_id)
      .single();

    if (battleError || !battle) {
      return errorResponse('Battle not found');
    }

    if (battle.status !== 'in_progress') {
      return errorResponse('Battle is not in progress');
    }

    // Get rounds
    const { data: rounds, error: roundsError } = await supabase
      .from('battle_royale_rounds')
      .select('*, challenge:challenges(*)')
      .eq('battle_id', body.battle_id)
      .order('round_number', { ascending: true });

    if (roundsError || !rounds) {
      return errorResponse('Failed to get battle rounds');
    }

    // Process each round
    for (const round of rounds) {
      if (round.status === 'completed') continue;

      // Mark round as in progress
      await supabase
        .from('battle_royale_rounds')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', round.id);

      // Update battle current round
      await supabase
        .from('battle_royales')
        .update({ current_round: round.round_number })
        .eq('id', body.battle_id);

      // Run each participant against the challenge
      for (const participant of battle.participants) {
        const agent = participant.agent;
        if (!agent) continue;

        // Call agent API
        const agentResponse = await callAgent(agent.api_endpoint, {
          prompt: round.challenge.prompt,
          expected_output: round.challenge.expected_output,
        });

        // Score the response
        const score = scoreResponse(
          agentResponse.response,
          round.challenge.expected_output,
          round.challenge.type
        );

        // Build round score
        const roundScore: RoundScore = {
          round: round.round_number,
          score,
          time_ms: agentResponse.time_ms,
          challenge_type: round.challenge.type,
        };

        // Update participant scores
        const existingScores = participant.round_scores || [];
        const newScores = [...existingScores, roundScore];
        const newTotal = newScores.reduce((sum, s) => sum + s.score, 0);

        await supabase
          .from('battle_royale_participants')
          .update({
            round_scores: newScores,
            total_score: newTotal,
          })
          .eq('id', participant.id);
      }

      // Mark round as completed
      await supabase
        .from('battle_royale_rounds')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', round.id);
    }

    // All rounds complete - calculate final rankings
    const { data: finalParticipants, error: finalError } = await supabase
      .from('battle_royale_participants')
      .select('*')
      .eq('battle_id', body.battle_id)
      .order('total_score', { ascending: false });

    if (finalError || !finalParticipants) {
      return errorResponse('Failed to get final rankings');
    }

    // Calculate payouts
    const payouts = calculatePayouts(
      battle.total_pool_sol,
      battle.platform_fee_pct,
      battle.payout_structure as PayoutType
    );

    // Update participant rankings and payouts
    for (let i = 0; i < finalParticipants.length; i++) {
      const participant = finalParticipants[i];
      let payout = 0;

      if (i === 0) payout = payouts.first;
      else if (i === 1) payout = payouts.second;
      else if (i === 2) payout = payouts.third;

      await supabase
        .from('battle_royale_participants')
        .update({
          final_rank: i + 1,
          payout_sol: payout,
        })
        .eq('id', participant.id);
    }

    // Update battle as completed
    const winnerId = finalParticipants[0]?.agent_id || null;
    const secondId = finalParticipants[1]?.agent_id || null;
    const thirdId = finalParticipants[2]?.agent_id || null;

    await supabase
      .from('battle_royales')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        winner_id: winnerId,
        second_place_id: secondId,
        third_place_id: thirdId,
      })
      .eq('id', body.battle_id);

    // Update agent stats for winner
    if (winnerId) {
      const { data: winnerAgent } = await supabase
        .from('agents')
        .select('wins, elo_rating')
        .eq('id', winnerId)
        .single();

      if (winnerAgent) {
        // ELO boost for winning battle royale
        const eloBoost = 25 + (finalParticipants.length * 2);
        await supabase
          .from('agents')
          .update({
            wins: winnerAgent.wins + 1,
            elo_rating: winnerAgent.elo_rating + eloBoost,
          })
          .eq('id', winnerId);
      }
    }

    // TODO: Process actual SOL payouts via Solana
    // This would integrate with the Solana wallet

    return jsonResponse({
      success: true,
      message: 'Battle completed',
      winner_id: winnerId,
      results: finalParticipants.map((p, i) => ({
        rank: i + 1,
        agent_id: p.agent_id,
        total_score: p.total_score,
        payout_sol: i === 0 ? payouts.first : i === 1 ? payouts.second : i === 2 ? payouts.third : 0,
      })),
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
});
