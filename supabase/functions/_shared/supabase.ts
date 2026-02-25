/**
 * Shared Supabase client and utilities for Edge Functions
 * Security-hardened configuration
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Environment & Configuration
// =============================================================================

const CANONICAL_ORIGIN = 'https://theragnarok.fun';
const ALLOWED_ORIGINS = [
  CANONICAL_ORIGIN,
  'https://www.theragnarok.fun',
  'https://ragnarok-n9qq.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Get the appropriate CORS origin based on the request
 */
function getAllowedOrigin(requestOrigin: string | null): string {
  if (!requestOrigin) return CANONICAL_ORIGIN;

  // Check if the origin is in our allowed list
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Default to canonical origin for security
  return CANONICAL_ORIGIN;
}

/**
 * Generate CORS headers for a specific request
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-signature, x-wallet-message',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Legacy CORS headers for backwards compatibility
 * NOTE: These use the canonical origin
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': CANONICAL_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-signature, x-wallet-message',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// =============================================================================
// Supabase Clients
// =============================================================================

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseAnonClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseAnonKey);
}

// =============================================================================
// Response Helpers
// =============================================================================

export function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  const headers = request ? getCorsHeaders(request) : corsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400, request?: Request): Response {
  return jsonResponse({ success: false, error: message }, status, request);
}

export function optionsResponse(request: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(request) });
}

// =============================================================================
// Input Validation Utilities
// =============================================================================

/**
 * Validate a Solana wallet address (base58 encoded, 32-44 chars)
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * Validate a UUID
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate bet amount within tier limits
 */
export function isValidBetAmount(amount: number, maxBet: number = 10): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) return false;
  return amount > 0 && amount <= maxBet;
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose internal error details
    const message = error.message.toLowerCase();
    if (message.includes('duplicate') || message.includes('unique')) {
      return 'This entry already exists';
    }
    if (message.includes('foreign key') || message.includes('reference')) {
      return 'Referenced resource not found';
    }
    if (message.includes('permission') || message.includes('policy')) {
      return 'Permission denied';
    }
  }
  return 'An unexpected error occurred';
}
