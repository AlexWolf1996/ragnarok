/**
 * Solana Transaction & Wallet Verification Utilities
 * For Edge Functions
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from 'https://esm.sh/@solana/web3.js@1.98.4';
import * as nacl from 'https://esm.sh/tweetnacl@1.0.3';
import bs58 from 'https://esm.sh/bs58@6.0.0';

// =============================================================================
// Configuration
// =============================================================================

const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';
const RAGNAROK_TREASURY_WALLET = Deno.env.get('RAGNAROK_TREASURY_WALLET') || '';

// Transaction confirmation settings
const CONFIRMATION_TIMEOUT_MS = 30000;
const MAX_TRANSACTION_AGE_SLOTS = 150; // ~1 minute on mainnet

// =============================================================================
// Solana Connection
// =============================================================================

let connectionInstance: Connection | null = null;

function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(SOLANA_RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: CONFIRMATION_TIMEOUT_MS,
    });
  }
  return connectionInstance;
}

// =============================================================================
// Transaction Verification
// =============================================================================

export interface TransactionVerificationResult {
  success: boolean;
  error?: string;
  amountSol?: number;
  sender?: string;
  recipient?: string;
  slot?: number;
}

/**
 * Verify a Solana transaction for a bet or buy-in payment
 *
 * @param signature - The transaction signature (base58 encoded)
 * @param expectedAmountSol - The expected amount in SOL
 * @param senderWallet - The expected sender wallet address
 * @param recipientWallet - Optional: specific recipient (defaults to treasury)
 * @param tolerancePercent - Allowed deviation from expected amount (default 1%)
 */
export async function verifyTransaction(
  signature: string,
  expectedAmountSol: number,
  senderWallet: string,
  recipientWallet?: string,
  tolerancePercent: number = 1
): Promise<TransactionVerificationResult> {
  const connection = getConnection();
  const recipient = recipientWallet || RAGNAROK_TREASURY_WALLET;

  if (!recipient) {
    return {
      success: false,
      error: 'Treasury wallet not configured',
    };
  }

  try {
    // Validate signature format
    if (!isValidSignature(signature)) {
      return {
        success: false,
        error: 'Invalid transaction signature format',
      };
    }

    // Fetch the transaction
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return {
        success: false,
        error: 'Transaction not found or not yet confirmed',
      };
    }

    // Check if transaction succeeded
    if (transaction.meta?.err) {
      return {
        success: false,
        error: 'Transaction failed on-chain',
      };
    }

    // Verify transaction is not too old (prevent replay attacks)
    const currentSlot = await connection.getSlot();
    if (currentSlot - (transaction.slot || 0) > MAX_TRANSACTION_AGE_SLOTS) {
      return {
        success: false,
        error: 'Transaction is too old',
      };
    }

    // Parse and verify the transfer
    const transferInfo = parseTransferFromTransaction(transaction);

    if (!transferInfo) {
      return {
        success: false,
        error: 'No valid SOL transfer found in transaction',
      };
    }

    // Verify sender
    if (transferInfo.sender.toLowerCase() !== senderWallet.toLowerCase()) {
      return {
        success: false,
        error: 'Transaction sender does not match',
      };
    }

    // Verify recipient
    if (transferInfo.recipient.toLowerCase() !== recipient.toLowerCase()) {
      return {
        success: false,
        error: 'Transaction recipient does not match treasury',
      };
    }

    // Verify amount (with tolerance for network fees)
    const expectedLamports = expectedAmountSol * LAMPORTS_PER_SOL;
    const tolerance = expectedLamports * (tolerancePercent / 100);

    if (Math.abs(transferInfo.amountLamports - expectedLamports) > tolerance) {
      return {
        success: false,
        error: `Amount mismatch: expected ${expectedAmountSol} SOL, got ${transferInfo.amountLamports / LAMPORTS_PER_SOL} SOL`,
      };
    }

    return {
      success: true,
      amountSol: transferInfo.amountLamports / LAMPORTS_PER_SOL,
      sender: transferInfo.sender,
      recipient: transferInfo.recipient,
      slot: transaction.slot,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Verification failed: ${message}`,
    };
  }
}

interface TransferInfo {
  sender: string;
  recipient: string;
  amountLamports: number;
}

function parseTransferFromTransaction(transaction: ParsedTransactionWithMeta): TransferInfo | null {
  const instructions = transaction.transaction.message.instructions;

  for (const instruction of instructions) {
    // Check for System Program transfer
    if ('parsed' in instruction && instruction.program === 'system') {
      const parsed = instruction.parsed;
      if (parsed.type === 'transfer') {
        return {
          sender: parsed.info.source,
          recipient: parsed.info.destination,
          amountLamports: parsed.info.lamports,
        };
      }
    }
  }

  // Check inner instructions for transfers (e.g., from wrapped transactions)
  const innerInstructions = transaction.meta?.innerInstructions || [];
  for (const innerGroup of innerInstructions) {
    for (const instruction of innerGroup.instructions) {
      if ('parsed' in instruction && instruction.program === 'system') {
        const parsed = instruction.parsed;
        if (parsed.type === 'transfer') {
          return {
            sender: parsed.info.source,
            recipient: parsed.info.destination,
            amountLamports: parsed.info.lamports,
          };
        }
      }
    }
  }

  return null;
}

function isValidSignature(signature: string): boolean {
  try {
    const decoded = bs58.decode(signature);
    return decoded.length === 64;
  } catch {
    return false;
  }
}

// =============================================================================
// Wallet Signature Verification (Sign-In With Solana)
// =============================================================================

export interface SignatureVerificationResult {
  success: boolean;
  error?: string;
  walletAddress?: string;
}

/**
 * Verify a wallet signature to prove ownership
 *
 * @param walletAddress - The claimed wallet address
 * @param message - The message that was signed (includes nonce + timestamp)
 * @param signature - The signature (base58 encoded)
 */
export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string
): Promise<SignatureVerificationResult> {
  try {
    // Validate wallet address format
    if (!isValidWalletAddress(walletAddress)) {
      return {
        success: false,
        error: 'Invalid wallet address format',
      };
    }

    // Decode the wallet public key
    const publicKey = new PublicKey(walletAddress);
    const publicKeyBytes = publicKey.toBytes();

    // Decode the signature
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(signature);
    } catch {
      return {
        success: false,
        error: 'Invalid signature format',
      };
    }

    if (signatureBytes.length !== 64) {
      return {
        success: false,
        error: 'Invalid signature length',
      };
    }

    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature using nacl
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return {
        success: false,
        error: 'Signature verification failed',
      };
    }

    // Parse and validate the message contents
    const messageValidation = validateSignedMessage(message);
    if (!messageValidation.success) {
      return {
        success: false,
        error: messageValidation.error,
      };
    }

    return {
      success: true,
      walletAddress,
    };

  } catch (error) {
    return {
      success: false,
      error: 'Signature verification error',
    };
  }
}

interface MessageValidation {
  success: boolean;
  error?: string;
}

/**
 * Validate the signed message format and timestamp
 * Expected format: "Ragnarok Authentication\nTimestamp: {ISO_DATE}\nNonce: {RANDOM}"
 */
function validateSignedMessage(message: string): MessageValidation {
  // Check for required prefix
  if (!message.startsWith('Ragnarok Authentication')) {
    return {
      success: false,
      error: 'Invalid message format',
    };
  }

  // Extract timestamp
  const timestampMatch = message.match(/Timestamp:\s*([^\n]+)/);
  if (!timestampMatch) {
    return {
      success: false,
      error: 'Missing timestamp in message',
    };
  }

  // Validate timestamp is not too old (5 minutes max)
  const timestamp = new Date(timestampMatch[1].trim());
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  if (isNaN(timestamp.getTime())) {
    return {
      success: false,
      error: 'Invalid timestamp format',
    };
  }

  if (timestamp < fiveMinutesAgo) {
    return {
      success: false,
      error: 'Message has expired',
    };
  }

  if (timestamp > now) {
    return {
      success: false,
      error: 'Invalid timestamp (future date)',
    };
  }

  // Check for nonce
  const nonceMatch = message.match(/Nonce:\s*([^\n]+)/);
  if (!nonceMatch || nonceMatch[1].trim().length < 16) {
    return {
      success: false,
      error: 'Invalid or missing nonce',
    };
  }

  return { success: true };
}

function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// =============================================================================
// Utility: Check if transaction was already used (prevent double-spending)
// =============================================================================

/**
 * Store and check transaction signatures to prevent reuse
 * This should be called after successful verification
 */
export async function checkAndStoreTransaction(
  supabaseClient: unknown,
  signature: string,
  purpose: 'bet' | 'buy_in' | 'registration'
): Promise<{ alreadyUsed: boolean; error?: string }> {
  try {
    // Type assertion for Supabase client
    const supabase = supabaseClient as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            single: () => Promise<{ data: unknown; error: unknown }>;
          };
        };
        insert: (data: object) => Promise<{ error: unknown }>;
      };
    };

    // Check if signature exists
    const { data, error: selectError } = await supabase
      .from('used_transactions')
      .select('id')
      .eq('signature', signature)
      .single();

    if (selectError && (selectError as { code?: string }).code !== 'PGRST116') {
      // Table might not exist yet, which is fine for now
      return { alreadyUsed: false };
    }

    if (data) {
      return { alreadyUsed: true };
    }

    // Store the signature
    const { error: insertError } = await supabase
      .from('used_transactions')
      .insert({
        signature,
        purpose,
        used_at: new Date().toISOString(),
      });

    if (insertError) {
      // If insert fails due to duplicate, transaction was already used
      return { alreadyUsed: true };
    }

    return { alreadyUsed: false };

  } catch {
    // If table doesn't exist, allow the transaction (backwards compatibility)
    return { alreadyUsed: false };
  }
}
