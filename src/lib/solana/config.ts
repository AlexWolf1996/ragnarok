import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

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
