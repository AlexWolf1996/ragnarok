/**
 * Input Validation Utilities
 * Using Zod for type-safe runtime validation
 */

import { z } from 'zod';

// =============================================================================
// Wallet Address Validation
// =============================================================================

/**
 * Solana wallet address validator (base58 encoded, 32-44 characters)
 */
export const walletAddressSchema = z
  .string()
  .min(32, 'Wallet address too short')
  .max(44, 'Wallet address too long')
  .regex(
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    'Invalid wallet address format (must be base58 encoded)'
  );

/**
 * Validate a Solana wallet address
 */
export function isValidWalletAddress(address: string): boolean {
  return walletAddressSchema.safeParse(address).success;
}

// =============================================================================
// UUID Validation
// =============================================================================

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

export function isValidUUID(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

// =============================================================================
// URL Validation
// =============================================================================

export const httpsUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => url.startsWith('https://'),
    'URL must use HTTPS protocol'
  );

export const urlSchema = z.string().url('Invalid URL format');

export function isValidHttpsUrl(url: string): boolean {
  return httpsUrlSchema.safeParse(url).success;
}

export function isValidUrl(url: string): boolean {
  return urlSchema.safeParse(url).success;
}

// =============================================================================
// Amount Validation
// =============================================================================

export const betAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .min(0.01, 'Minimum bet is 0.01 SOL')
  .max(10, 'Maximum bet is 10 SOL');

export const buyInAmountSchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(100, 'Maximum buy-in is 100 SOL');

export function isValidBetAmount(amount: number): boolean {
  return betAmountSchema.safeParse(amount).success;
}

// =============================================================================
// Transaction Signature Validation
// =============================================================================

export const transactionSignatureSchema = z
  .string()
  .min(80, 'Invalid transaction signature')
  .max(90, 'Invalid transaction signature')
  .regex(
    /^[1-9A-HJ-NP-Za-km-z]+$/,
    'Invalid transaction signature format (must be base58 encoded)'
  );

export function isValidTransactionSignature(signature: string): boolean {
  return transactionSignatureSchema.safeParse(signature).success;
}

// =============================================================================
// Agent Registration Validation
// =============================================================================

export const agentNameSchema = z
  .string()
  .min(3, 'Agent name must be at least 3 characters')
  .max(32, 'Agent name must be at most 32 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Agent name can only contain letters, numbers, underscores, and hyphens'
  );

export const agentRegistrationSchema = z.object({
  name: agentNameSchema,
  wallet_address: walletAddressSchema,
  endpoint_url: httpsUrlSchema,
  avatar_url: httpsUrlSchema.optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

export type AgentRegistrationInput = z.infer<typeof agentRegistrationSchema>;

// =============================================================================
// Battle/Bet Request Validation
// =============================================================================

export const placeBetRequestSchema = z.object({
  battle_id: uuidSchema,
  agent_id: uuidSchema,
  amount_sol: betAmountSchema,
  wallet_address: walletAddressSchema,
  transaction_signature: transactionSignatureSchema,
  wallet_signature: z.string().optional(),
  signed_message: z.string().optional(),
});

export type PlaceBetRequest = z.infer<typeof placeBetRequestSchema>;

export const joinBattleRequestSchema = z.object({
  battle_id: uuidSchema,
  agent_id: uuidSchema,
  wallet_address: walletAddressSchema,
  transaction_signature: transactionSignatureSchema,
  wallet_signature: z.string().optional(),
  signed_message: z.string().optional(),
});

export type JoinBattleRequest = z.infer<typeof joinBattleRequestSchema>;

// =============================================================================
// Commentary API Validation
// =============================================================================

export const commentaryRequestSchema = z.object({
  agentA: z.object({
    name: z.string().min(1),
    elo_rating: z.number().int().min(0),
  }),
  agentB: z.object({
    name: z.string().min(1),
    elo_rating: z.number().int().min(0),
  }),
  challenge: z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    difficulty_level: z.string().min(1),
  }),
  score_a: z.number().int().min(0).max(100),
  score_b: z.number().int().min(0).max(100),
  winner_id: z.string().nullable(),
  winnerName: z.string().min(1),
});

export type CommentaryRequest = z.infer<typeof commentaryRequestSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Safely parse and validate request body
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error message from Zod errors
  const errorMessages = result.error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');

  return { success: false, error: errorMessages };
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Invalid input data';
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Don't expose database structure
    if (message.includes('duplicate') || message.includes('unique')) {
      return 'This entry already exists';
    }
    if (message.includes('foreign key') || message.includes('reference')) {
      return 'Referenced resource not found';
    }
    if (message.includes('permission') || message.includes('policy')) {
      return 'Permission denied';
    }
    if (message.includes('not found')) {
      return 'Resource not found';
    }
  }

  return 'An unexpected error occurred';
}
