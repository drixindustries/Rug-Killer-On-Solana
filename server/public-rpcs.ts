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
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://solana-mainnet.phantom.tech",
  "https://mainnet.rpc.solana.ninja",
  "https://api.rpcpool.com",
  "https://solana.mapple.tech",
  "https://solana.blockpi.io/v1/rpc/public",
  
  // High-availability endpoints from extrnode list (Tier 2 - fast, distributed)
  // US-based endpoints (Amazon AWS)
  "http://54.204.139.215:8545",
  "http://44.192.126.28:8545",
  "http://34.228.238.169:8545",
  "http://44.204.98.29:8545",
  "http://54.210.164.38:8545",
  "http://44.211.182.66:8545",
  "http://54.89.100.193:8545",
  "http://3.237.105.246:8545",
  "http://18.206.85.48:8545",
  "http://44.202.179.1:8545",
  "http://100.27.43.86:8545",
  "http://54.166.160.116:8545",
  "http://54.196.164.136:8545",
  "http://3.89.202.223:8545",
  "http://44.193.207.61:8545",
  "http://3.235.99.159:8545",
  "http://184.72.74.39:8545",
  "http://34.201.47.230:8545",
  "http://3.95.233.102:8545",
  "http://44.192.108.69:8545",
  "http://54.157.109.147:8545",
  "http://3.87.128.21:8545",
  "http://18.209.1.38:8545",
  "http://44.201.60.107:8545",
  "http://3.227.246.145:8545",
  "http://18.232.178.219:8545",
  "http://3.228.0.61:8545",
  
  // US-based Limestone Networks
  "http://64.31.24.66:8899",
  "http://64.31.14.162:8899",
  
  // Brazil-based high-performance cluster (Latitude.sh)
  "http://103.50.32.83:8899",
  "http://103.50.32.87:8899",
  "http://103.50.32.65:8899",
  "http://103.50.32.79:8899",
  "http://103.50.32.89:8899",
  "http://103.50.32.68:8899",
  "http://103.50.32.86:8899",
  "http://103.50.32.74:8899",
  "http://103.50.32.84:8899",
  "http://103.50.32.75:8899",
  "http://103.50.32.64:8899",
  "http://103.50.32.73:8899",
  "http://103.50.32.80:8899",
  "http://103.50.32.77:8899",
  "http://103.50.32.62:8899",
  "http://103.50.32.71:8899",
  "http://103.50.32.67:8899",
  "http://103.50.32.81:8899",
  "http://103.50.32.78:8899",
  "http://103.50.32.88:8899",
  "http://103.50.32.70:8899",
  "http://103.50.32.85:8899",
  "http://103.50.32.69:8899",
  "http://103.50.32.66:8899",
  "http://186.233.186.148:8899",
  "http://186.233.184.77:8899",
  "http://186.233.184.93:8899",
  "http://186.233.184.96:8899",
  "http://186.233.186.149:8899",
  "http://186.233.186.153:8899",
  "http://185.209.178.48:8899",
  "http://185.209.176.41:8899",
  "http://185.209.177.210:8899",
  "http://185.209.177.222:8899",
  "http://185.209.177.211:8899",
  "http://185.209.178.55:8080",
  "http://185.209.178.55:80",
  "http://185.209.177.213:8899",
  "http://185.209.177.221:8899",
  "http://185.209.177.212:8899",
  "http://185.209.177.123:8899",
  "http://185.209.176.49:8899",
  "http://185.209.177.209:8899",
  "http://69.67.151.244:8899",
  "http://69.67.151.238:8899",
  "http://199.254.199.38:8899",
  "http://207.188.6.68:8899",
  "http://207.188.6.73:8899",
  "http://207.188.6.72:8899",
  "http://45.250.253.14:8899",
  "http://198.178.224.215:8899",
  
  // Europe-based (OVH France)
  "http://15.204.161.219:80",
  "http://15.204.161.225:80",
];

// Tier classification for intelligent routing
export const RPC_TIERS = {
  TIER1_PREMIUM: PUBLIC_SOLANA_RPCS.slice(0, 12), // Official + well-known providers
  TIER2_US: PUBLIC_SOLANA_RPCS.filter(url => url.includes('8545')), // US-based AWS cluster
  TIER3_BRAZIL: PUBLIC_SOLANA_RPCS.filter(url => url.includes('8899') && (url.includes('103.') || url.includes('186.') || url.includes('185.'))), // Brazil cluster
  TIER4_GLOBAL: PUBLIC_SOLANA_RPCS.filter(url => !url.includes('8545') && !url.includes('8899')), // Other global endpoints
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
