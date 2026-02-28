import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection } from '@solana/web3.js';

// Default fallback URL for build time
const DEFAULT_RPC_URL = 'https://api.mainnet-beta.solana.com';

// Get network from environment variable - only read at runtime
export const getSolanaNetwork = (): WalletAdapterNetwork => {
  // Default to mainnet-beta to match the Helius RPC URL
  const networkEnv = typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SOLANA_NETWORK
    ? process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta'
    : 'mainnet-beta';

  switch (networkEnv) {
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet;
    case 'testnet':
      return WalletAdapterNetwork.Testnet;
    case 'devnet':
    default:
      return WalletAdapterNetwork.Devnet;
  }
};

export const getSolanaEndpoint = (): string => {
  // Always return a valid URL - use env var if available, otherwise default
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (customRpc && customRpc.startsWith('http')) {
    return customRpc;
  }

  // Use default for build time or when env var not set
  return DEFAULT_RPC_URL;
};

// Lazy config getter to avoid build-time evaluation
export const getSolanaConfig = () => ({
  network: getSolanaNetwork(),
  endpoint: getSolanaEndpoint(),
});

/**
 * Server-side RPC connection with failover.
 * Tries Helius first, then NEXT_PUBLIC_SOLANA_RPC_URL, then public mainnet.
 * Each endpoint is health-checked with getLatestBlockhash before use.
 */
export async function getConnection(): Promise<Connection> {
  const endpoints = [
    process.env.HELIUS_RPC_URL,
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    DEFAULT_RPC_URL,
  ].filter((url): url is string => Boolean(url && url.startsWith('http')));

  // Deduplicate
  const unique = [...new Set(endpoints)];

  for (const endpoint of unique) {
    try {
      const conn = new Connection(endpoint, 'confirmed');
      await conn.getLatestBlockhash();
      return conn;
    } catch {
      console.warn(`[Solana RPC] ${endpoint} failed, trying next...`);
    }
  }
  throw new Error('All Solana RPC endpoints failed');
}
