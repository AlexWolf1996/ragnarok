import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, TablesInsert } from './types';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient<Database> | null = null;

function getSupabase(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

// Export getter for backwards compatibility
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ============================================================================
// Agent Operations
// ============================================================================

export async function registerAgent(data: TablesInsert<'agents'>) {
  const { data: agent, error } = await supabase
    .from('agents')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return agent;
}

export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('elo_rating', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAgentByWallet(wallet: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('wallet_address', wallet)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function getAgentById(id: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function checkAgentNameExists(name: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  return supabase
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
  const { count: totalMatches, error: matchError } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  if (matchError) throw matchError;

  const { count: activeAgents, error: agentError } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true });

  if (agentError) throw agentError;

  const { data: topAgent, error: topError } = await supabase
    .from('agents')
    .select('name, elo_rating')
    .order('elo_rating', { ascending: false })
    .limit(1)
    .single();

  if (topError && topError.code !== 'PGRST116') throw topError;

  // Calculate total wagered from matches with bets (new betting system)
  let totalWageredFromMatches = 0;
  const { data: matchBets, error: matchBetsError } = await supabase
    .from('matches')
    .select('bet_amount_lamports')
    .not('bet_status', 'is', null)
    .neq('bet_status', 'none');

  if (!matchBetsError && matchBets) {
    // Sum lamports and convert to SOL
    const totalLamports = matchBets.reduce(
      (sum, m) => sum + (m.bet_amount_lamports || 0),
      0
    );
    totalWageredFromMatches = totalLamports / 1_000_000_000; // lamports to SOL
  }

  // Also check legacy bets table (if it exists)
  let totalWageredFromBets = 0;
  try {
    const { data: betsData } = await supabase
      .from('bets')
      .select('amount_sol');

    if (betsData) {
      totalWageredFromBets = betsData.reduce((sum, bet) => sum + (bet.amount_sol || 0), 0);
    }
  } catch {
    // bets table may not exist, ignore
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
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAgentRecentMatches(agentId: string, limit: number = 5) {
  const { data, error } = await supabase
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
  const { data: bet, error } = await supabase
    .from('bets')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return bet;
}

export async function getMatchBets(matchId: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('difficulty', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getRandomChallenge() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * data.length);
  return data[randomIndex];
}

export async function getChallengeById(id: string) {
  const { data, error } = await supabase
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

  // Return in format expected by arena page
  return {
    match_id: data.matchId,
    winner_id: data.winner?.id,
    ...data,
  };
}

export async function updateMatchSolanaTxHash(matchId: string, txHash: string) {
  const { data, error } = await supabase
    .from('matches')
    .update({ solana_tx_hash: txHash })
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export default supabase;
