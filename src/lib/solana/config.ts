import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

// Get network from environment variable
const networkEnv = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

export const getSolanaNetwork = (): WalletAdapterNetwork => {
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
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (customRpc) {
    return customRpc;
  }
  return clusterApiUrl(getSolanaNetwork());
};

export const solanaConfig = {
  network: getSolanaNetwork(),
  endpoint: getSolanaEndpoint(),
} as const;
