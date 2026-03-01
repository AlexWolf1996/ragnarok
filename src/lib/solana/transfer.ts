import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// Timeout helper — races a promise against a timer
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Browser-safe RPC endpoints (CORS-friendly only).
// Public mainnet is listed first — premium RPCs like Helius often block browser CORS.
const CLIENT_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
].filter((url): url is string => Boolean(url && url.startsWith('http')));

/**
 * Get a working Connection on the client side.
 * Tries NEXT_PUBLIC_SOLANA_RPC_URL first, then public mainnet, health-checking each.
 */
async function getClientConnection(): Promise<Connection> {
  const unique = [...new Set(CLIENT_RPC_ENDPOINTS)];
  for (const endpoint of unique) {
    try {
      const conn = new Connection(endpoint, 'confirmed');
      await withTimeout(conn.getLatestBlockhash(), 8_000, `RPC health-check ${endpoint}`);
      return conn;
    } catch {
      console.warn(`[Solana RPC Client] ${endpoint} failed, trying next...`);
    }
  }
  throw new Error('Could not reach Solana network. Please check your connection and try again.');
}

// Betting tier amounts in SOL
export const BETTING_TIERS = {
  bifrost: 0.01,
  midgard: 0.1,
  asgard: 1.0,
} as const;

export type BettingTier = keyof typeof BETTING_TIERS;

// Convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction?: <T extends Transaction>(transaction: T) => Promise<T>;
}

interface TransferResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Get the treasury wallet public key from env
 */
export function getTreasuryWallet(): PublicKey {
  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET;
  if (!treasuryAddress) {
    throw new Error('Treasury wallet not configured. Set NEXT_PUBLIC_TREASURY_WALLET.');
  }
  return new PublicKey(treasuryAddress);
}

/**
 * Transfer SOL to treasury wallet for betting
 * Returns signature immediately after wallet signs - verification happens on backend
 */
export async function transferToTreasury(
  walletAdapter: WalletAdapter,
  tier: BettingTier,
  existingConnection?: Connection
): Promise<TransferResult> {
  if (!walletAdapter.publicKey) {
    return { success: false, error: 'Wallet not connected' };
  }

  const amountSol = BETTING_TIERS[tier];
  const amountLamports = solToLamports(amountSol);

  try {
    const treasuryWallet = getTreasuryWallet();

    // Use passed connection, but health-check it first.
    // If the endpoint has CORS issues (e.g. Helius free tier), fall back to
    // getClientConnection() which uses public mainnet (always CORS-friendly).
    let connection: Connection;
    if (existingConnection) {
      try {
        await withTimeout(existingConnection.getLatestBlockhash('confirmed'), 8_000, 'RPC health-check');
        connection = existingConnection;
      } catch {
        console.warn('[Solana Transfer] Passed connection failed health-check, using fallback...');
        connection = await getClientConnection();
      }
    } else {
      connection = await getClientConnection();
    }

    console.log(`[Solana Transfer] Initiating ${amountSol} SOL transfer to treasury: ${treasuryWallet.toBase58()}`);

    if (!walletAdapter.signTransaction) {
      return { success: false, error: 'Wallet does not support signing transactions' };
    }

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: walletAdapter.publicKey,
      toPubkey: treasuryWallet,
      lamports: amountLamports,
    });

    // Build transaction — set feePayer and blockhash BEFORE signing
    // so Phantom can simulate it properly
    const transaction = new Transaction().add(transferInstruction);
    const { blockhash } = await withTimeout(
      connection.getLatestBlockhash('confirmed'),
      10_000,
      'getLatestBlockhash'
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletAdapter.publicKey;

    // Pre-simulate to catch errors before the wallet popup.
    // Pass no signers so web3.js sends sigVerify: false for the unsigned tx.
    console.log('[Solana Transfer] Pre-simulating transaction...');
    const simulation = await connection.simulateTransaction(transaction);

    if (simulation.value.err) {
      const simError = JSON.stringify(simulation.value.err);
      console.error('[Solana Transfer] Simulation failed:', simError);
      if (simulation.value.logs) {
        console.error('[Solana Transfer] Simulation logs:', simulation.value.logs.join('\n'));
      }
      if (simError.includes('InsufficientFunds') || simError.includes('0x1')) {
        return { success: false, error: 'Insufficient SOL balance for this transaction.' };
      }
      return { success: false, error: `Transaction simulation failed: ${simError}` };
    }
    console.log('[Solana Transfer] Simulation passed');

    // Sign with wallet (signTransaction only — avoids Phantom sendTransaction issues)
    const signed = await walletAdapter.signTransaction(transaction);

    // Send the signed transaction ourselves
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      maxRetries: 3,
      skipPreflight: true, // We already simulated above
      preflightCommitment: 'confirmed',
    });
    console.log(`[Solana Transfer] Transaction sent: ${signature}`);

    // Return signature immediately — backend will verify
    return { success: true, signature };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
    console.error('[Solana Transfer] Error:', errorMessage);

    if (errorMessage.includes('insufficient')) {
      return { success: false, error: 'Insufficient SOL balance for this transaction.' };
    }
    if (errorMessage.includes('User rejected')) {
      return { success: false, error: 'Transaction was rejected in wallet.' };
    }
    if (errorMessage.includes('timed out') || errorMessage.includes('Could not reach')) {
      return { success: false, error: 'Network connection to Solana failed. Please try again.' };
    }
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return { success: false, error: 'Could not reach Solana network. Check your connection.' };
    }

    return { success: false, error: errorMessage };
  }
}

interface VerificationResult {
  valid: boolean;
  error?: string;
}

// Helper to wait for a specified time
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify a transaction on-chain with full validation:
 * - Confirmed/finalized status
 * - Correct recipient (treasury wallet)
 * - Correct amount (matches tier)
 */
export async function verifyTransaction(
  signature: string,
  expectedTier?: BettingTier
): Promise<boolean> {
  const result = await verifyTransactionDetails(signature, expectedTier);
  return result.valid;
}

/**
 * Full transaction verification with retry loop for backend use
 * Retries 5 times with 3 second intervals to wait for confirmation
 */
export async function verifyTransactionDetails(
  signature: string,
  expectedTier?: BettingTier,
  maxRetries: number = 5,
  retryDelayMs: number = 3000
): Promise<VerificationResult> {
  const { getConnection } = await import('./config');
  const connection = await getConnection();

  console.log(`[Solana Verify] Checking transaction: ${signature}`);

  // Retry loop to wait for transaction confirmation
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Solana Verify] Attempt ${attempt}/${maxRetries}`);

      // Check confirmation status using getSignatureStatuses (batch-friendly)
      const statuses = await connection.getSignatureStatuses([signature]);
      const status = statuses.value[0];

      if (status?.err) {
        console.log(`[Solana Verify] Transaction has error:`, status.err);
        return { valid: false, error: 'Transaction failed on-chain' };
      }

      const confirmationStatus = status?.confirmationStatus;

      if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
        console.log(`[Solana Verify] Confirmation status: ${confirmationStatus}`);
        break; // Transaction confirmed, proceed to verify details
      }

      // Not confirmed yet
      console.log(`[Solana Verify] Not confirmed yet. Status: ${confirmationStatus || 'null'}`);

      if (attempt < maxRetries) {
        console.log(`[Solana Verify] Waiting ${retryDelayMs}ms before retry...`);
        await sleep(retryDelayMs);
      } else {
        // All retries exhausted
        return {
          valid: false,
          error: 'Transaction not yet confirmed. Please try again in a moment.'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Status check failed';
      console.error(`[Solana Verify] Error on attempt ${attempt}:`, errorMessage);

      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
      } else {
        return { valid: false, error: errorMessage };
      }
    }
  }

  // Transaction is confirmed, now verify the details
  try {
    // Fetch full transaction to verify amount and recipient
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      console.log(`[Solana Verify] Transaction not found`);
      return { valid: false, error: 'Transaction not found' };
    }

    // Find the SOL transfer instruction
    const instructions = tx.transaction.message.instructions;
    let transferFound = false;
    let transferAmount = 0;
    let transferRecipient = '';

    for (const instruction of instructions) {
      // Check if it's a parsed system program transfer
      if ('parsed' in instruction && instruction.program === 'system') {
        const parsed = instruction.parsed;
        if (parsed.type === 'transfer') {
          transferFound = true;
          transferAmount = parsed.info.lamports;
          transferRecipient = parsed.info.destination;
          console.log(`[Solana Verify] Found transfer: ${transferAmount} lamports to ${transferRecipient}`);
          break;
        }
      }
    }

    if (!transferFound) {
      console.log(`[Solana Verify] No SOL transfer instruction found`);
      return { valid: false, error: 'No SOL transfer found in transaction' };
    }

    // Verify recipient is treasury wallet (from env, NOT hardcoded)
    const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET;
    if (!treasuryAddress) {
      console.error(`[Solana Verify] Treasury wallet not configured`);
      return { valid: false, error: 'Treasury wallet not configured' };
    }

    if (transferRecipient !== treasuryAddress) {
      console.log(`[Solana Verify] Wrong recipient. Expected: ${treasuryAddress}, Got: ${transferRecipient}`);
      return { valid: false, error: 'Payment sent to wrong address' };
    }

    console.log(`[Solana Verify] Recipient verified: ${transferRecipient}`);

    // Verify amount matches tier (if tier provided)
    if (expectedTier) {
      const expectedAmount = solToLamports(BETTING_TIERS[expectedTier]);
      // Allow 1% tolerance for rounding
      const tolerance = Math.floor(expectedAmount * 0.01);

      if (Math.abs(transferAmount - expectedAmount) > tolerance) {
        console.log(`[Solana Verify] Wrong amount. Expected: ${expectedAmount}, Got: ${transferAmount}`);
        return { valid: false, error: `Incorrect payment amount. Expected ${BETTING_TIERS[expectedTier]} SOL` };
      }

      console.log(`[Solana Verify] Amount verified: ${transferAmount} lamports (${lamportsToSol(transferAmount)} SOL)`);
    }

    console.log(`[Solana Verify] Transaction fully verified!`);
    return { valid: true };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Verification failed';
    console.error(`[Solana Verify] Error:`, errorMessage);
    return { valid: false, error: errorMessage };
  }
}

