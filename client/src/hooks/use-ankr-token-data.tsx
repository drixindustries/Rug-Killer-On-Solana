import { useTokenHolders, useTokenHoldersCount, useAccountBalance } from 'ankr-react';

/**
 * Custom hook to fetch Solana token holder data using Ankr API
 * Note: Ankr primarily supports EVM chains. For Solana-specific data,
 * consider using Solana's native RPC methods or specialized Solana APIs.
 */
export function useAnkrTokenHolders(contractAddress: string, blockchain: 'eth' | 'bsc' | 'polygon' = 'eth') {
  const { data, error, isLoading } = useTokenHolders({
    blockchain,
    contractAddress,
    pageSize: 100,
  });

  return {
    holders: data?.holders || [],
    error,
    isLoading,
  };
}

/**
 * Custom hook to get token holder count using Ankr API
 */
export function useAnkrTokenHoldersCount(contractAddress: string, blockchain: 'eth' | 'bsc' | 'polygon' = 'eth') {
  const { data, error, isLoading } = useTokenHoldersCount({
    blockchain,
    contractAddress,
  });

  return {
    data,
    error,
    isLoading,
  };
}

/**
 * Custom hook to get account balance using Ankr API
 */
export function useAnkrAccountBalance(
  walletAddress: string,
  blockchain?: 'eth' | 'bsc' | 'polygon' | 'arbitrum' | 'avalanche' | ('eth' | 'bsc' | 'polygon' | 'arbitrum' | 'avalanche')[]
) {
  const { data, error, isLoading } = useAccountBalance({
    walletAddress,
    blockchain,
  });

  return {
    balances: data?.assets || [],
    totalBalanceUsd: data?.totalBalanceUsd || 0,
    error,
    isLoading,
  };
}

/**
 * Note: Ankr React Hooks are designed for EVM-compatible chains.
 * For Solana-specific functionality, you should:
 * 1. Use Solana's native web3.js library
 * 2. Use the backend API endpoints that connect to Solana RPC
 * 3. Consider using Ankr's Solana RPC endpoint directly via fetch/axios
 * 
 * Example Solana-specific approach:
 * ```typescript
 * const response = await fetch('/api/solana/token-holders', {
 *   method: 'POST',
 *   body: JSON.stringify({ tokenAddress })
 * });
 * ```
 */
