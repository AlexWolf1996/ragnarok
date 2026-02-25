import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

interface MatchHashData {
  matchId: string;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
}

interface WalletAdapter {
  publicKey: PublicKey | null;
  signTransaction?: <T extends Transaction>(transaction: T) => Promise<T>;
}

/**
 * Hash match result to Solana devnet as a memo transaction.
 * This creates a permanent on-chain record of the match result.
 */
export async function hashMatchToSolana(
  data: MatchHashData,
  walletAdapter: WalletAdapter
): Promise<string | null> {
  if (!walletAdapter.publicKey) {
    return null;
  }

  if (!walletAdapter.signTransaction) {
    return null;
  }

  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Create memo data - this will be stored on-chain
    const memo = JSON.stringify({
      type: 'RAGNAROK_MATCH',
      match_id: data.matchId,
      winner_id: data.winnerId,
      scores: { a: data.scoreA, b: data.scoreB },
      timestamp: Date.now(),
    });

    // Create memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    });

    // Build transaction
    const transaction = new Transaction().add(memoInstruction);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletAdapter.publicKey;

    // Sign transaction with wallet
    const signed = await walletAdapter.signTransaction(transaction);

    // Send and confirm transaction
    const txHash = await connection.sendRawTransaction(signed.serialize());

    await connection.confirmTransaction({
      signature: txHash,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    return txHash;
  } catch {
    return null;
  }
}

/**
 * Get the Solana Explorer URL for a transaction
 */
export function getSolanaExplorerUrl(
  txHash: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): string {
  return `https://explorer.solana.com/tx/${txHash}?cluster=${network}`;
}
