// A list of public Solana RPC endpoints for broader access.
// This list is used to rotate through different providers to distribute load
// and avoid single points of failure.

export const PUBLIC_SOLANA_RPCS = [
  // Official Solana RPCs (often rate-limited)
  "https://api.mainnet-beta.solana.com",
  "https://solana-api.projectserum.com",

  // Public RPCs from various providers
  "https://rpc.ankr.com/solana",
  "https://solana.public-rpc.com",
  "https://solana-mainnet.rpc.extrnode.com",
  "https://solana-mainnet.phantom.tech",
  "https://mainnet.rpc.solana.ninja",
  "https://api.rpcpool.com",
  "https://solana.mapple.tech",
  
  // Some additional community endpoints
  "https://solana.blockpi.io/v1/rpc/public",
  "https://solana-mainnet.g.alchemy.com/v2/demo", // Note: Demo key, may be rate-limited
];

// Function to get a random RPC endpoint from the list
export function getRandomPublicRpc(): string {
  const randomIndex = Math.floor(Math.random() * PUBLIC_SOLANA_RPCS.length);
  return PUBLIC_SOLANA_RPCS[randomIndex];
}
