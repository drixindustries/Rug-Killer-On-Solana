/**
 * Public Solana RPC Endpoints
 * Source: https://github.com/extrnode/rpc-solana-endpoints
 * Updated: November 21, 2025
 * 
 * This extensive list includes 80+ public RPC endpoints for:
 * - Load distribution across multiple providers
 * - Redundancy and failover
 * - Rate limit avoidance
 * - Geographic distribution (US, Brazil, etc.)
 */

export const PUBLIC_SOLANA_RPCS = [
  // Official Solana RPCs (Tier 1 - often rate-limited but reliable)
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",

  // Premium Public RPCs (Tier 1 - well-known providers)
  // REMOVED: Ankr and Phantom - returning 403 Forbidden errors
  "https://solana.public-rpc.com",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://mainnet.rpc.solana.ninja",
  "https://api.rpcpool.com",
  "https://solana.mapple.tech",
  "https://solana.blockpi.io/v1/rpc/public",
  
  // REMOVED: AWS, Limestone, Brazil, and Europe endpoints
  // These HTTP endpoints were consistently timing out (>5s) causing performance issues
  // Keeping only HTTPS endpoints from known reliable providers
];

// Tier classification for intelligent routing
export const RPC_TIERS = {
  TIER1_PREMIUM: PUBLIC_SOLANA_RPCS, // All remaining endpoints are reliable HTTPS providers
};

// Function to get a random RPC endpoint from the list
export function getRandomPublicRpc(): string {
  const randomIndex = Math.floor(Math.random() * PUBLIC_SOLANA_RPCS.length);
  return PUBLIC_SOLANA_RPCS[randomIndex];
}

// Get RPC from specific tier for optimized routing
export function getRpcFromTier(tier: keyof typeof RPC_TIERS): string {
  const tierEndpoints = RPC_TIERS[tier];
  if (tierEndpoints.length === 0) return getRandomPublicRpc();
  const randomIndex = Math.floor(Math.random() * tierEndpoints.length);
  return tierEndpoints[randomIndex];
}

// Get multiple RPCs for parallel requests
export function getMultipleRpcs(count: number = 3): string[] {
  const shuffled = [...PUBLIC_SOLANA_RPCS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
