import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { lamportsToSol } from './transfer';

interface PayoutResult {
  success: boolean;
  signature?: string;
  payoutLamports?: number;
  error?: string;
}

/**
 * Load the treasury Keypair from TREASURY_PRIVATE_KEY (base58-encoded).
 * This must ONLY run server-side.
 */
function getTreasuryKeypair(): Keypair {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TREASURY_PRIVATE_KEY not configured');
  }
  const decoded = bs58.decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}

/**
 * Send SOL payout from treasury to a winning bettor.
 * Server-side only — uses TREASURY_PRIVATE_KEY to sign.
 *
 * @param bettorWallet  - The winner's wallet address
 * @param payoutLamports - Exact payout amount in lamports (already calculated by parimutuel system)
 * @returns PayoutResult with tx signature on success
 */
export async function sendPayout(
  bettorWallet: string,
  payoutLamports: number,
): Promise<PayoutResult> {

  console.log(
    `[Payout] Sending ${lamportsToSol(payoutLamports)} SOL (${payoutLamports} lamports) to ${bettorWallet}`,
  );

  try {
    const treasuryKeypair = getTreasuryKeypair();
    const recipient = new PublicKey(bettorWallet);

    const { getConnection } = await import('./config');
    const connection = await getConnection();

    // Verify treasury has enough balance
    const balance = await connection.getBalance(treasuryKeypair.publicKey);
    // Need payout + ~5000 lamports for tx fee
    if (balance < payoutLamports + 5000) {
      console.error(
        `[Payout] Insufficient treasury balance: ${balance} lamports, need ${payoutLamports + 5000}`,
      );
      return {
        success: false,
        error: 'Treasury has insufficient funds for payout',
      };
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipient,
        lamports: payoutLamports,
      }),
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair],
      { commitment: 'confirmed' },
    );

    console.log(`[Payout] Success! Signature: ${signature}`);
    return { success: true, signature, payoutLamports };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Payout failed';
    console.error(`[Payout] Error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}
