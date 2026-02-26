import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, TablesInsert } from './types';

// Lazy initialization to avoid build-time errors during static page generation
let _supabase: SupabaseClient<Database> | null = null;

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Safe placeholder URL that's valid for Supabase client creation
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTY5MTgwMDAsImV4cCI6MTkzMjQ5NDAwMH0.placeholder';

function getSupabase(): SupabaseClient<Database> {
  if (_supabase) {
    return _supabase;
  }

  // Use real env vars in browser, placeholders during SSR/build
  let supabaseUrl: string;
  let supabaseAnonKey: string;

  if (isBrowser) {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;
  } else {
    // During SSR/build, use placeholders to avoid errors
    // The actual API calls won't happen during build anyway
    supabaseUrl = PLACEHOLDER_URL;
    supabaseAnonKey = PLACEHOLDER_KEY;
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

// Export a getter function
export function getSupabaseClient(): SupabaseClient<Database> {
  return getSupabase();
}

// For backwards compatibility - Proxy that lazily initializes
export const supabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_, prop: string) {
      const client = getSupabase();
      const value = client[prop as keyof SupabaseClient<Database>];
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    },
  }
);

// ============================================================================
// Agent Operations
// ============================================================================

export async function registerAgent(data: TablesInsert<'agents'>) {
  const { data: agent, error } = await getSupabase()
    .from('agents')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return agent;
}

export async function getAgents() {
  const { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .order('elo_rating', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAgentByWallet(wallet: string) {
  const { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .eq('wallet_address', wallet)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAgentById(id: string) {
  const { data, error } = await getSupabase()
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function checkAgentNameExists(name: string) {
  const { data, error } = await getSupabase()
    .from('agents')
    .select('id')
    .eq('name', name)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// ============================================================================
// Match Operations
// ============================================================================

export async function getRecentMatches(limit: number = 10) {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      *,
      agent_a:agents!matches_agent_a_id_fkey(*),
      agent_b:agents!matches_agent_b_id_fkey(*),
      winner:agents!matches_winner_id_fkey(*),
      challenge:challenges(*)
    `)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getLiveMatches() {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      *,
      agent_a:agents!matches_agent_a_id_fkey(*),
      agent_b:agents!matches_agent_b_id_fkey(*),
      challenge:challenges(*)
    `)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMatchById(id: string) {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      *,
      agent_a:agents!matches_agent_a_id_fkey(*),
      agent_b:agents!matches_agent_b_id_fkey(*),
      winner:agents!matches_winner_id_fkey(*),
      challenge:challenges(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToMatches(
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Tables<'matches'>;
    old: Tables<'matches'> | null;
  }) => void
): RealtimeChannel {
  return getSupabase()
    .channel('matches-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Tables<'matches'>,
          old: payload.old as Tables<'matches'> | null,
        });
      }
    )
    .subscribe();
}

export async function getMatchStats() {
  const client = getSupabase();

  const { count: totalMatches, error: matchError } = await client
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  if (matchError) throw matchError;

  const { count: activeAgents, error: agentError } = await client
    .from('agents')
    .select('*', { count: 'exact', head: true });

  if (agentError) throw agentError;

  const { data: topAgent, error: topError } = await client
    .from('agents')
    .select('name, elo_rating')
    .order('elo_rating', { ascending: false })
    .limit(1)
    .single();

  if (topError && topError.code !== 'PGRST116') throw topError;

  let totalWageredFromMatches = 0;
  const { data: matchBets, error: matchBetsError } = await client
    .from('matches')
    .select('bet_amount_lamports')
    .not('bet_status', 'is', null)
    .neq('bet_status', 'none');

  if (!matchBetsError && matchBets) {
    const totalLamports = matchBets.reduce(
      (sum, m) => sum + (m.bet_amount_lamports || 0),
      0
    );
    totalWageredFromMatches = totalLamports / 1_000_000_000;
  }

  let totalWageredFromBets = 0;
  try {
    const { data: betsData } = await client
      .from('bets')
      .select('amount_sol');

    if (betsData) {
      totalWageredFromBets = betsData.reduce((sum, bet) => sum + (bet.amount_sol || 0), 0);
    }
  } catch {
    // bets table may not exist
  }

  const totalWagered = totalWageredFromMatches + totalWageredFromBets;

  return {
    totalMatches: totalMatches || 0,
    activeAgents: activeAgents || 0,
    topAgent: topAgent || null,
    totalWagered,
  };
}

// ============================================================================
// Leaderboard Operations
// ============================================================================

export async function getLeaderboard() {
  const { data, error } = await getSupabase()
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAgentRecentMatches(agentId: string, limit: number = 5) {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      *,
      agent_a:agents!matches_agent_a_id_fkey(name),
      agent_b:agents!matches_agent_b_id_fkey(name),
      winner:agents!matches_winner_id_fkey(name)
    `)
    .or(`agent_a_id.eq.${agentId},agent_b_id.eq.${agentId}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ============================================================================
// Betting Operations
// ============================================================================

export async function placeBet(data: TablesInsert<'bets'>) {
  const { data: bet, error } = await getSupabase()
    .from('bets')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return bet;
}

export async function getMatchBets(matchId: string) {
  const { data, error } = await getSupabase()
    .from('bets')
    .select(`
      *,
      agent:agents(name)
    `)
    .eq('match_id', matchId);

  if (error) throw error;
  return data;
}

export async function getBetsByWallet(walletAddress: string) {
  const { data, error } = await getSupabase()
    .from('bets')
    .select(`
      *,
      match:matches(*),
      agent:agents(name)
    `)
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ============================================================================
// Challenge Operations
// ============================================================================

export async function getChallenges() {
  const { data, error } = await getSupabase()
    .from('challenges')
    .select('*')
    .order('difficulty', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getRandomChallenge() {
  const { data, error } = await getSupabase()
    .from('challenges')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

export async function getChallengeById(id: string) {
  const { data, error } = await getSupabase()
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// Match Execution (API Route)
// ============================================================================

export async function runMatch(agentAId: string, agentBId: string, challengeId?: string) {
  const response = await fetch('/api/battles/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentAId,
      agentBId,
      challengeId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Battle execution failed');
  }

  return {
    match_id: data.matchId,
    winner_id: data.winner?.id,
    ...data,
  };
}

export async function updateMatchSolanaTxHash(matchId: string, txHash: string) {
  const { data, error } = await getSupabase()
    .from('matches')
    .update({ solana_tx_hash: txHash })
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all matches where this wallet placed a bet, with agent names.
 */
export async function getMatchBetsByWallet(walletAddress: string) {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      id,
      created_at,
      completed_at,
      status,
      agent_a_id,
      agent_b_id,
      agent_a_score,
      agent_b_score,
      winner_id,
      bet_amount_lamports,
      bettor_wallet,
      bettor_pick_id,
      bet_tx_signature,
      bet_status,
      tier,
      payout_tx_signature,
      agent_a:agents!matches_agent_a_id_fkey(id, name),
      agent_b:agents!matches_agent_b_id_fkey(id, name)
    `)
    .eq('bettor_wallet', walletAddress)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export default supabase;
