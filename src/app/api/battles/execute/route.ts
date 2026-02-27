/**
 * Battle Execute API - Manual agent selection battles
 *
 * POST /api/battles/execute - Execute a battle between two specific agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeBattle, BattleResult } from '@/lib/battles/engine';
import { isValidUUID } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

export interface BattleExecuteRequest {
  agentAId: string;
  agentBId: string;
  challengeId?: string; // Optional - will pick random if not provided
}

export interface BattleExecuteResponse extends BattleResult {
  responses: {
    agentA: string;
    agentB: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 6 battles per minute per IP
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = checkRateLimit(`execute:${ip}`, 6);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.', retryAfterMs },
        { status: 429 }
      );
    }

    // Check required env vars
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'GROQ_API_KEY environment variable is not set',
        },
        { status: 500 }
      );
    }

    const body: BattleExecuteRequest = await request.json();
    const { agentAId, agentBId, challengeId } = body;

    // Validate input
    if (!agentAId || !agentBId) {
      return NextResponse.json(
        { error: 'Both agentAId and agentBId are required' },
        { status: 400 }
      );
    }

    // Validate UUID formats
    if (!isValidUUID(agentAId) || !isValidUUID(agentBId)) {
      return NextResponse.json(
        { error: 'Invalid agent ID format' },
        { status: 400 }
      );
    }

    if (challengeId && !isValidUUID(challengeId)) {
      return NextResponse.json(
        { error: 'Invalid challenge ID format' },
        { status: 400 }
      );
    }

    if (agentAId === agentBId) {
      return NextResponse.json(
        { error: 'An agent cannot battle itself' },
        { status: 400 }
      );
    }

    console.log(`[Battle] Execute request: ${agentAId} vs ${agentBId}${challengeId ? ` (challenge: ${challengeId})` : ''}`);

    // Execute the battle using shared engine
    const battleResult = await executeBattle(agentAId, agentBId, challengeId);

    // Return extended response with responses field for backward compatibility
    const response: BattleExecuteResponse = {
      ...battleResult,
      responses: {
        agentA: battleResult.agentA.response,
        agentB: battleResult.agentB.response,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Battle] Execute error:', error);

    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('not found')) {
      statusCode = 404;
    } else if (errorMessage.includes('cannot battle itself')) {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        error: 'Battle execution failed',
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}
