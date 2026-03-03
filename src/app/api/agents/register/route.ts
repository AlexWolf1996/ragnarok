import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { agentEndpointUrlSchema, isPrivateOrReservedHost } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Create admin client for server-side operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

// Valid avatar options
const VALID_AVATARS = ['wolf', 'raven', 'serpent', 'hammer', 'shield', 'axe', 'skull', 'flame'];

// Avatar emoji map for avatar_url storage
const AVATAR_EMOJIS: Record<string, string> = {
  wolf: '🐺',
  raven: '🪶',
  serpent: '🐍',
  hammer: '🔨',
  shield: '🛡️',
  axe: '🪓',
  skull: '💀',
  flame: '🔥',
};

interface RegisterRequest {
  name: string;
  avatar: string;
  systemPrompt: string;
  walletAddress: string;
  endpointUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per minute
    const ip = getClientIp(request);
    const rateCheck = await checkRateLimit(`agent-register:${ip}`, 5);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again in a minute.' },
        { status: 429 },
      );
    }

    const body: RegisterRequest = await request.json();
    const { name, avatar, systemPrompt, walletAddress, endpointUrl } = body;

    // Validate wallet address
    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Validate name (3-30 chars)
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }
    if (trimmedName.length < 3) {
      return NextResponse.json(
        { error: 'Name must be at least 3 characters' },
        { status: 400 }
      );
    }
    if (trimmedName.length > 30) {
      return NextResponse.json(
        { error: 'Name must be 30 characters or less' },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmedName)) {
      return NextResponse.json(
        { error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' },
        { status: 400 }
      );
    }

    // Validate system prompt (20-2000 chars)
    const trimmedPrompt = systemPrompt?.trim();
    if (!trimmedPrompt) {
      return NextResponse.json(
        { error: 'System prompt is required' },
        { status: 400 }
      );
    }
    if (trimmedPrompt.length < 20) {
      return NextResponse.json(
        { error: 'System prompt must be at least 20 characters' },
        { status: 400 }
      );
    }
    if (trimmedPrompt.length > 2000) {
      return NextResponse.json(
        { error: 'System prompt must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Validate avatar
    if (!avatar || !VALID_AVATARS.includes(avatar)) {
      return NextResponse.json(
        { error: 'Invalid avatar selection' },
        { status: 400 }
      );
    }

    // Validate optional custom endpoint
    let validatedEndpoint = 'groq://ragnarok';
    if (endpointUrl && endpointUrl.trim()) {
      const urlResult = agentEndpointUrlSchema.safeParse(endpointUrl.trim());
      if (!urlResult.success) {
        const msg = urlResult.error.errors[0]?.message || 'Invalid endpoint URL';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      // Double-check SSRF at runtime
      const parsed = new URL(endpointUrl.trim());
      if (isPrivateOrReservedHost(parsed.hostname)) {
        return NextResponse.json(
          { error: 'Endpoint URL must not target private or reserved addresses' },
          { status: 400 },
        );
      }

      // Health-check the endpoint before accepting
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const response = await fetch(endpointUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Health check: respond with a short greeting.',
            agent_name: '__health_check__',
          }),
          signal: controller.signal,
          credentials: 'omit',
          redirect: 'error',
        });
        clearTimeout(timeout);

        if (!response.ok) {
          return NextResponse.json(
            { error: `Custom endpoint returned HTTP ${response.status}. It must return 200 with { response: string }.` },
            { status: 400 },
          );
        }

        const data = await response.json();
        if (!data.response || typeof data.response !== 'string') {
          return NextResponse.json(
            { error: 'Custom endpoint must return JSON with a "response" string field' },
            { status: 400 },
          );
        }

        validatedEndpoint = endpointUrl.trim();
      } catch (fetchErr) {
        const msg = fetchErr instanceof DOMException && fetchErr.name === 'AbortError'
          ? 'Custom endpoint timed out (10s limit)'
          : 'Failed to reach custom endpoint';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdmin();

    // Check max 3 agents per wallet
    const { data: existingAgents } = await supabase
      .from('agents')
      .select('id, created_at')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    if (existingAgents && existingAgents.length >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 agents per wallet reached' },
        { status: 400 }
      );
    }

    // 24-hour cooldown between registrations
    if (existingAgents && existingAgents.length > 0) {
      const lastCreated = new Date(existingAgents[0].created_at);
      const hoursSince = (Date.now() - lastCreated.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        return NextResponse.json(
          { error: `Please wait ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} before registering another agent` },
          { status: 429 }
        );
      }
    }

    // Check if name is taken
    const { data: existingByName } = await supabase
      .from('agents')
      .select('id')
      .eq('name', trimmedName)
      .single();

    if (existingByName) {
      return NextResponse.json(
        { error: 'This name is already taken' },
        { status: 400 }
      );
    }

    // Create the agent
    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert({
        name: trimmedName,
        wallet_address: walletAddress,
        avatar_url: AVATAR_EMOJIS[avatar], // Store emoji as avatar_url
        system_prompt: trimmedPrompt,
        api_endpoint: validatedEndpoint,
        elo_rating: 1000,
        wins: 0,
        losses: 0,
        matches_played: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create agent:', insertError);
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        avatar: avatar,
        eloRating: agent.elo_rating,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
