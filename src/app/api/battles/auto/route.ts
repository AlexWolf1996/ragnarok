/**
 * Auto-Battle API Endpoint
 *
 * Picks 2 random agents that haven't fought in the last 5 minutes
 * and executes a battle between them.
 *
 * Can be triggered by:
 * - Vercel Cron
 * - External ping service
 * - Manual trigger to keep arena alive
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeBattle, getSupabaseAdmin } from '@/lib/battles/engine';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Cooldown period in minutes - agents can't fight again within this window
const COOLDOWN_MINUTES = 5;

export async function GET(request: NextRequest) {
  return handleAutoBattle(request);
}

export async function POST(request: NextRequest) {
  return handleAutoBattle(request);
}

async function handleAutoBattle(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limit: 6 auto-battles per minute per IP
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = checkRateLimit(`auto:${ip}`, 6);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Try again later.', retryAfterMs },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get the cooldown timestamp
    const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();

    // Get all agents
    const { data: allAgents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name')
      .order('elo_rating', { ascending: false });

    if (agentsError || !allAgents || allAgents.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not enough agents available for battle',
          agentCount: allAgents?.length || 0
        },
        { status: 400 }
      );
    }

    // Get recent matches to find agents on cooldown
    const { data: recentMatches, error: matchesError } = await supabase
      .from('matches')
      .select('agent_a_id, agent_b_id, completed_at')
      .or(`completed_at.gte.${cooldownTime},and(status.eq.in_progress,created_at.gte.${cooldownTime})`)
      .in('status', ['completed', 'in_progress'])
      .order('completed_at', { ascending: false });

    if (matchesError) {
      console.error('[AutoBattle] Error fetching recent matches:', matchesError);
    }

    // Build set of agents on cooldown
    const agentsOnCooldown = new Set<string>();
    if (recentMatches) {
      for (const match of recentMatches) {
        if (match.agent_a_id) agentsOnCooldown.add(match.agent_a_id);
        if (match.agent_b_id) agentsOnCooldown.add(match.agent_b_id);
      }
    }

    // Filter to available agents
    const availableAgents = allAgents.filter(agent => !agentsOnCooldown.has(agent.id));

    console.log(`[AutoBattle] ${availableAgents.length}/${allAgents.length} agents available (${agentsOnCooldown.size} on cooldown)`);

    // Need at least 2 available agents
    if (availableAgents.length < 2) {
      // If not enough available, pick from all agents but avoid same-pair repeat
      const lastMatch = recentMatches?.[0];
      const fallbackAgents = allAgents.filter(agent =>
        !lastMatch || (agent.id !== lastMatch.agent_a_id && agent.id !== lastMatch.agent_b_id)
      );

      if (fallbackAgents.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'All agents are on cooldown. Try again later.',
            cooldownMinutes: COOLDOWN_MINUTES,
            agentsOnCooldown: agentsOnCooldown.size
          },
          { status: 429 }
        );
      }

      // Use fallback agents
      availableAgents.length = 0;
      availableAgents.push(...fallbackAgents);
    }

    // Shuffle and pick 2 random agents
    const shuffled = availableAgents.sort(() => Math.random() - 0.5);
    const agentA = shuffled[0];
    const agentB = shuffled[1];

    console.log(`[AutoBattle] Selected: ${agentA.name} vs ${agentB.name}`);

    // Execute the battle
    const result = await executeBattle(agentA.id, agentB.id);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Auto-battle completed: ${result.winner.name} defeats ${result.loser.name}`,
      matchId: result.matchId,
      duration: `${duration}ms`,
      battle: {
        agentA: {
          id: result.agentA.id,
          name: result.agentA.name,
          score: result.agentA.score,
          eloDelta: result.agentA.eloDelta,
          isWinner: result.agentA.isWinner,
        },
        agentB: {
          id: result.agentB.id,
          name: result.agentB.name,
          score: result.agentB.score,
          eloDelta: result.agentB.eloDelta,
          isWinner: result.agentB.isWinner,
        },
        challenge: {
          name: result.challenge.name,
          type: result.challenge.type,
        },
        winner: result.winner.name,
      },
    });

  } catch (error) {
    console.error('[AutoBattle] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-battle failed',
        duration: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  }
}
