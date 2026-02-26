import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

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

interface SendTransactionOptions {
  maxRetries?: number;
  skipPreflight?: boolean;
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
}

interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction?: <T extends Transaction>(transaction: T) => Promise<T>;
  sendTransaction?: (
    transaction: Transaction,
    connection: Connection,
    options?: SendTransactionOptions
  ) => Promise<string>;
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

    // Prefer the connection passed from WalletProvider (already configured with correct endpoint)
    // Fall back to creating our own if none provided
    const connection = existingConnection || new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    console.log(`[Solana Transfer] Initiating ${amountSol} SOL transfer to treasury: ${treasuryWallet.toBase58()}`);

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: walletAdapter.publicKey,
      toPubkey: treasuryWallet,
      lamports: amountLamports,
    });

    // Build transaction
    const transaction = new Transaction().add(transferInstruction);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletAdapter.publicKey;

    // Send transaction using wallet adapter's sendTransaction
    let signature: string;

    if (walletAdapter.sendTransaction) {
      signature = await walletAdapter.sendTransaction(transaction, connection, {
        maxRetries: 3,
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      console.log(`[Solana Transfer] Transaction sent: ${signature}`);
    } else if (walletAdapter.signTransaction) {
      const signed = await walletAdapter.signTransaction(transaction);
      signature = await connection.sendRawTransaction(signed.serialize(), {
        maxRetries: 3,
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      console.log(`[Solana Transfer] Transaction sent: ${signature}`);
    } else {
      return { success: false, error: 'Wallet does not support transactions' };
    }

    // DO NOT wait for confirmation here - return signature immediately
    // Backend will verify the transaction with retries
    console.log(`[Solana Transfer] Returning signature for backend verification`);
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
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

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

/**
 * Calculate potential payout (1.9x for winner, 5% rake)
 */
export function calculatePayout(amountLamports: number): number {
  return Math.floor(amountLamports * 1.9);
}
