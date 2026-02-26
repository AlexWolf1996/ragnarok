import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

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
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { name, avatar, systemPrompt, walletAddress } = body;

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

    // Validate system prompt (10-500 chars)
    const trimmedPrompt = systemPrompt?.trim();
    if (!trimmedPrompt) {
      return NextResponse.json(
        { error: 'System prompt is required' },
        { status: 400 }
      );
    }
    if (trimmedPrompt.length < 10) {
      return NextResponse.json(
        { error: 'System prompt must be at least 10 characters' },
        { status: 400 }
      );
    }
    if (trimmedPrompt.length > 500) {
      return NextResponse.json(
        { error: 'System prompt must be 500 characters or less' },
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

    const supabase = getSupabaseAdmin();

    // Check if wallet already has an agent
    const { data: existingByWallet } = await supabase
      .from('agents')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingByWallet) {
      return NextResponse.json(
        { error: 'You already have a registered agent' },
        { status: 400 }
      );
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
    // Note: api_endpoint is legacy - battles now use Groq directly
    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert({
        name: trimmedName,
        wallet_address: walletAddress,
        avatar_url: AVATAR_EMOJIS[avatar], // Store emoji as avatar_url
        system_prompt: trimmedPrompt,
        api_endpoint: 'groq://ragnarok', // Placeholder - battles use Groq API
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
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
