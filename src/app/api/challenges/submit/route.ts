/**
 * Challenge Submission Endpoint
 *
 * POST /api/challenges/submit
 * Body: { wallet_address, category, challenge_text }
 *
 * Validates submission, runs AI quality check via Groq, and stores.
 * Rate limit: max 3 submissions per wallet per day.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/battles/engine';
import { isValidWalletAddress } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

const VALID_CATEGORIES = ['strategy', 'code', 'reasoning', 'creative', 'knowledge'];

interface SubmitRequest {
  wallet_address: string;
  category: string;
  challenge_text: string;
}

/**
 * Validate challenge quality using Groq LLM.
 */
async function validateWithAI(category: string, challengeText: string): Promise<{
  approved: boolean;
  reason: string;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // If no Groq key, auto-approve (dev mode)
    return { approved: true, reason: 'Auto-approved (no GROQ_API_KEY configured)' };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a challenge quality validator for an AI battle arena. Evaluate whether a submitted challenge is suitable for the "${category}" category.

A good challenge must:
1. Require a 200+ word response to answer well
2. Be on-topic for the "${category}" category
3. Not be offensive, harmful, or trivial
4. Have no single "correct" answer — it should test reasoning and creativity
5. Be specific enough that responses can be meaningfully compared

Respond with ONLY a JSON object: {"approved": true/false, "reason": "brief explanation"}`,
          },
          {
            role: 'user',
            content: challengeText,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('[ChallengeValidation] Groq API error:', response.status);
      return { approved: true, reason: 'Auto-approved (AI validation unavailable)' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // Try to parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        approved: Boolean(parsed.approved),
        reason: String(parsed.reason || 'No reason given'),
      };
    }

    return { approved: true, reason: 'Auto-approved (could not parse AI response)' };
  } catch (err) {
    console.error('[ChallengeValidation] Error:', err);
    return { approved: true, reason: 'Auto-approved (validation error)' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitRequest = await request.json();
    const { wallet_address, category, challenge_text } = body;

    // Validate required fields
    if (!wallet_address || !category || !challenge_text) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: wallet_address, category, challenge_text' },
        { status: 400 },
      );
    }

    if (!isValidWalletAddress(wallet_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 },
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Valid: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate challenge text length (50-2000 chars)
    const trimmedText = challenge_text.trim();
    if (trimmedText.length < 50) {
      return NextResponse.json(
        { success: false, error: 'Challenge must be at least 50 characters' },
        { status: 400 },
      );
    }
    if (trimmedText.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Challenge must be 2000 characters or less' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Rate limit: max 3 submissions per wallet per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount } = await supabase
      .from('submitted_challenges')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_address', wallet_address)
      .gte('submitted_at', oneDayAgo);

    if (dailyCount !== null && dailyCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'Maximum 3 challenge submissions per day. Try again tomorrow.' },
        { status: 429 },
      );
    }

    // AI validation
    console.log(`[ChallengeSubmit] Validating challenge from ${wallet_address} in ${category}`);
    const validation = await validateWithAI(category.toLowerCase(), trimmedText);

    // Insert submission
    const { data: submission, error: insertError } = await supabase
      .from('submitted_challenges')
      .insert({
        wallet_address,
        category: category.toLowerCase(),
        challenge_text: trimmedText,
        status: validation.approved ? 'approved' : 'rejected',
        rejection_reason: validation.approved ? null : validation.reason,
        validated_at: new Date().toISOString(),
      })
      .select('id, status, rejection_reason')
      .single();

    if (insertError) {
      console.error('[ChallengeSubmit] Insert error:', insertError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to submit challenge' },
        { status: 500 },
      );
    }

    // If approved, also insert into the main challenges table
    if (validation.approved) {
      await supabase.from('challenges').insert({
        name: trimmedText.substring(0, 80),
        type: category.toLowerCase(),
        prompt: { question: trimmedText },
        expected_output: {},
        difficulty: 'medium',
      });
    }

    console.log(`[ChallengeSubmit] Challenge ${submission.id}: ${validation.approved ? 'approved' : 'rejected'} — ${validation.reason}`);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        rejection_reason: submission.rejection_reason,
      },
    });
  } catch (error) {
    console.error('[ChallengeSubmit] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
