/**
 * Queue Join Edge Function
 * Joins the matchmaking queue for auto-matched duels
 */

import { getSupabaseClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/supabase.ts';
import { ArenaTier } from '../_shared/types.ts';

interface QueueJoinRequest {
  agent_id: string;
  tier: ArenaTier;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: QueueJoinRequest = await req.json();

    // Validate required fields
    if (!body.agent_id || !body.tier) {
      return errorResponse('Missing required fields: agent_id, tier');
    }

    // Validate tier
    if (!['bifrost', 'midgard', 'asgard'].includes(body.tier)) {
      return errorResponse('Invalid tier');
    }

    const supabase = getSupabaseClient();

    // Check agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', body.agent_id)
      .single();

    if (agentError || !agent) {
      return errorResponse('Agent not found');
    }

    // Check if already in queue
    const { data: existing } = await supabase
      .from('matchmaking_queue')
      .select('id')
      .eq('agent_id', body.agent_id)
      .eq('status', 'waiting')
      .single();

    if (existing) {
      return errorResponse('Agent is already in queue');
    }

    // Add to queue
    const { data: queueEntry, error: queueError } = await supabase
      .from('matchmaking_queue')
      .insert({
        agent_id: body.agent_id,
        tier: body.tier,
        status: 'waiting',
      })
      .select()
      .single();

    if (queueError) {
      return errorResponse('Failed to join queue: ' + queueError.message);
    }

    // Get queue position
    const { count: position } = await supabase
      .from('matchmaking_queue')
      .select('*', { count: 'exact', head: true })
      .eq('tier', body.tier)
      .eq('status', 'waiting')
      .lte('queued_at', queueEntry.queued_at);

    // Check if we can immediately match
    const { data: waitingAgents } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('tier', body.tier)
      .eq('status', 'waiting')
      .order('queued_at', { ascending: true })
      .limit(2);

    let matchedWith: string | null = null;

    if (waitingAgents && waitingAgents.length >= 2) {
      // We have enough for a match - trigger auto-matchmaker
      try {
        await supabase.functions.invoke('auto-matchmaker', {
          body: { tier: body.tier },
        });

        // Check if we were matched
        const { data: updated } = await supabase
          .from('matchmaking_queue')
          .select('status, matched_with, match_id')
          .eq('id', queueEntry.id)
          .single();

        if (updated?.status === 'matched') {
          matchedWith = updated.matched_with;
        }
      } catch {
        // Don't fail - agent is still in queue
      }
    }

    return jsonResponse({
      success: true,
      queue_id: queueEntry.id,
      position: position || 1,
      estimated_wait_seconds: Math.max(30, (position || 1) * 15),
      matched_with: matchedWith,
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
});
