import { NextRequest, NextResponse } from 'next/server';
import { commentaryRequestSchema, validateRequest, sanitizeErrorMessage } from '@/lib/validation';

interface CommentaryLine {
  icon: string;
  label: string;
  text: string;
  color: 'amber' | 'cyan' | 'red' | 'emerald' | 'purple';
}

interface MatchData {
  agentA: { name: string; elo_rating: number };
  agentB: { name: string; elo_rating: number };
  challenge: { name: string; type: string; difficulty_level: string };
  score_a: number;
  score_b: number;
  winner_id: string | null;
  winnerName: string;
}

function generateFallbackCommentary(data: MatchData): CommentaryLine[] {
  const { agentA, agentB, challenge, score_a, score_b, winnerName } = data;

  return [
    {
      icon: '⚔️',
      label: 'MATCH BEGINS',
      text: `${agentA.name} and ${agentB.name} enter the arena. The crowd roars across the nine realms.`,
      color: 'amber',
    },
    {
      icon: '🎯',
      label: 'CHALLENGE REVEALED',
      text: `The Norns present: ${challenge.name}. A ${challenge.difficulty_level} trial awaits.`,
      color: 'cyan',
    },
    {
      icon: '💥',
      label: 'FIRST STRIKE',
      text: `${agentA.name} scores ${score_a} points. ${score_a > 70 ? 'Devastating precision!' : score_a > 40 ? 'A solid attempt.' : 'A shaky start.'}`,
      color: 'purple',
    },
    {
      icon: '🔥',
      label: 'COUNTER ATTACK',
      text: `${agentB.name} fires back with ${score_b} points. ${score_b > score_a ? 'The tide turns!' : 'Not enough to overcome!'}`,
      color: 'red',
    },
    {
      icon: '👑',
      label: 'VERDICT',
      text: `${winnerName} claims victory! ${Math.abs(score_a - score_b) > 40 ? 'A triumph worthy of Valhalla.' : 'A battle that shook Yggdrasil itself.'}`,
      color: 'emerald',
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let rawData: unknown;
    try {
      rawData = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate input using zod schema
    const validation = validateRequest(commentaryRequestSchema, rawData);

    if (!validation.success) {
      return NextResponse.json(
        { error: `Validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    const data = validation.data;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // If no API key, use fallback templates
    if (!apiKey) {
      return NextResponse.json({
        lines: generateFallbackCommentary(data),
        source: 'fallback',
      });
    }

    const { agentA, agentB, challenge, score_a, score_b, winnerName } = data;

    const prompt = `You are HEIMDALL, the all-seeing Norse battle commentator for RAGNAROK, an AI agent fighting arena. You speak with dramatic flair mixing UFC commentary energy with Norse mythology references.

Generate EXACTLY 5 lines of live match commentary for this battle. Each line must be a JSON object.

MATCH DATA:
- Agent A: "${agentA.name}" (ELO: ${agentA.elo_rating})
- Agent B: "${agentB.name}" (ELO: ${agentB.elo_rating})
- Challenge: "${challenge.name}" (Type: ${challenge.type}, Difficulty: ${challenge.difficulty_level})
- Score A: ${score_a}/100
- Score B: ${score_b}/100
- Winner: ${winnerName}

Return ONLY a JSON array of 5 objects, no markdown, no backticks. Each object has:
- "icon": single emoji
- "label": short dramatic label (2-4 words, ALL CAPS)
- "text": 1-2 sentences of dramatic commentary (max 30 words each)
- "color": one of "amber", "cyan", "red", "emerald", "purple"

Flow: 1) Opening hype, 2) Challenge reveal, 3) First agent performance, 4) Second agent performance, 5) Final verdict.

Keep it entertaining, dramatic, specific about scores. Reference Norse mythology.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      // Use fallback on API error
      return NextResponse.json({
        lines: generateFallbackCommentary(data),
        source: 'fallback',
      });
    }

    const result = await response.json();
    const text = result.content?.map((b: { text?: string }) => b.text || '').join('') || '[]';
    const cleaned = text.replace(/```json|```/g, '').trim();

    try {
      const lines = JSON.parse(cleaned) as CommentaryLine[];

      // Validate the response structure
      if (!Array.isArray(lines) || lines.length !== 5) {
        throw new Error('Invalid response structure');
      }

      // Validate each line has required fields
      for (const line of lines) {
        if (!line.icon || !line.label || !line.text || !line.color) {
          throw new Error('Missing required fields');
        }
      }

      return NextResponse.json({
        lines,
        source: 'ai',
      });
    } catch {
      // Use fallback on parse error
      return NextResponse.json({
        lines: generateFallbackCommentary(data),
        source: 'fallback',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
