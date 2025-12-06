import { Connection } from "@solana/web3.js";

// Exponential backoff configuration
const BACKOFF_CONFIG = {
  initialDelayMs: 500,
  maxDelayMs: 30000,
  multiplier: 2,
  maxRetries: 5,
  jitterFactor: 0.2 // Add 20% random jitter to prevent thundering herd
};

/**
 * Execute an RPC call with automatic retry and exponential backoff
 * Handles 429 rate limits and transient failures gracefully
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? BACKOFF_CONFIG.maxRetries;
  const initialDelayMs = options.initialDelayMs ?? BACKOFF_CONFIG.initialDelayMs;
  const maxDelayMs = options.maxDelayMs ?? BACKOFF_CONFIG.maxDelayMs;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      const is429 = error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
      const isTransient = is429 || 
        error?.message?.includes('ECONNRESET') || 
        error?.message?.includes('ETIMEDOUT') ||
        error?.message?.includes('socket hang up') ||
        error?.code === 'ENOTFOUND';
      
      if (attempt === maxRetries || !isTransient) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      let delayMs = initialDelayMs * Math.pow(BACKOFF_CONFIG.multiplier, attempt);
      delayMs = Math.min(delayMs, maxDelayMs);
      
      // Add jitter to prevent thundering herd
      const jitter = delayMs * BACKOFF_CONFIG.jitterFactor * Math.random();
      delayMs += jitter;
      
      if (options.onRetry) {
        options.onRetry(attempt + 1, error, delayMs);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('Operation failed after all retries');
}

interface RpcProvider {
  getUrl: () => string;
  weight: number;
  name: string;
  tier: 'premium' | 'overflow' | 'fallback'; // Added overflow tier for dRPC
  score: number;
  fails: number;
  avgLatency?: number;
  lastHealthCheck?: number;
  consecutiveFails: number;
  requiresKey?: boolean;
  hasKey?: () => boolean;
  requestCount?: number;
  lastRequestTime?: number;
  rateLimitResetTime?: number;
  isRateLimited?: boolean;
  // Added optional rate limit metadata used by balancer logic
  rateLimit?: number;
  rateLimitWindow?: number;
}

// Helper to safely read env vars even if a key was added with stray whitespace
function getEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim() === key) return v as string;
  }
  return undefined;
}

// Build Shyft API URL using API key
function getShyftUrl(): string | undefined {
  const apiKey = getEnv('SHYFT_KEY')?.trim();
  
  console.log('[Shyft Config] SHYFT_KEY present:', !!apiKey);
  
  if (!apiKey || apiKey.length === 0) {
    console.log('[Shyft Config] No Shyft API key found');
    return undefined;
  }

  // Strip quotes and whitespace
  const cleaned = apiKey.replace(/^\"|\"$/g, '').trim();
  
  // Shyft RPC endpoint format: https://rpc.shyft.to?api_key=YOUR_KEY
  const finalUrl = `https://rpc.shyft.to?api_key=${cleaned}`;
  console.log('[Shyft Config] Shyft URL configured');
  return finalUrl;
}

// Build Helius API URL using API key
function getHeliusUrl(): string | undefined {
  const apiKey = getEnv('HELIUS_API_KEY')?.trim();
  
  console.log('[Helius Config] HELIUS_API_KEY present:', !!apiKey);
  
  if (!apiKey || apiKey.length === 0) {
    console.log('[Helius Config] No Helius API key found');
    return undefined;
  }

  // Strip quotes and whitespace
  const cleaned = apiKey.replace(/^\"|\"$/g, '').trim();
  
  // Helius RPC endpoint format: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
  const finalUrl = `https://mainnet.helius-rpc.com/?api-key=${cleaned}`;
  console.log('[Helius Config] Helius URL configured');
  return finalUrl;
}

// ============================================================================
// RPC PROVIDER WEIGHTING STRATEGY (Dec 2025 - Grok Recommendations)
// ============================================================================
// Based on ~12M requests/month usage pattern:
// - Helius Premium: 50-60% (Primary - core polling/subscriptions, 10-80ms latency)
// - dRPC Free: 15-20% (Overflow - AI-balanced routing, 38-100ms, ~10M free/mo)
// - Public RPCs: 5-10% (Backup - rotate to avoid bans, 200-500ms)
// 
// Total estimated cost: ~$50-60/mo (Helius base + minor dRPC overage)
// ============================================================================

const RPC_PROVIDERS = [
  // ============================================================================
  // PREMIUM TIER - Paid APIs (50-60% of traffic)
  // Best for: Core scanning, real-time polling, critical operations
  // ============================================================================
  { 
    getUrl: () => `${getHeliusUrl() || ""}`,
    weight: 55, // PRIMARY: 50-60% of traffic - Solana-optimized, 10-80ms latency
    name: "Helius",
    tier: "premium" as const,
    requiresKey: true,
    hasKey: () => !!getHeliusUrl(),
    rateLimit: 50,
    rateLimitWindow: 1000
  },
  { 
    getUrl: () => `${getShyftUrl() || ""}`,
    weight: 12, // SECONDARY PREMIUM: If user has paid Shyft key
    name: "Shyft",
    tier: "premium" as const, // Upgraded to premium if key exists
    requiresKey: true,
    hasKey: () => !!getShyftUrl(),
    rateLimit: 10,
    rateLimitWindow: 60000
  },

  // ============================================================================
  // OVERFLOW TIER - dRPC Free (15-20% of traffic)
  // Best for: Burst overflow, non-critical scans, cost optimization
  // AI-balanced routing across 50+ operators, 38-100ms avg latency
  // ~10M requests/mo free, then $3.60/mo PAYG
  // ============================================================================
  { 
    getUrl: () => "https://solana.drpc.org",
    weight: 18, // OVERFLOW: 15-20% - decentralized, good RPS, MEV-safe
    name: "dRPC",
    tier: "overflow" as const,
    rateLimit: 100, // Higher limit due to AI load balancing
    rateLimitWindow: 10000
  },

  // ============================================================================
  // PUBLIC BACKUP TIER - Free RPCs (5-10% of traffic)
  // Best for: Ultra-cheap redundancy, rare low-priority queries
  // WARNING: Throttled, no SLA, 200-500ms delays, ban risks for bots
  // Rotate 3-5 endpoints to avoid IP bans
  // ============================================================================
  { 
    getUrl: () => "https://api.mainnet-beta.solana.com",
    weight: 7, // BACKUP: Official but throttled
    name: "Solana-Official",
    tier: "fallback" as const,
    rateLimit: 40,
    rateLimitWindow: 10000
  },
  { 
    getUrl: () => "https://solana-rpc.publicnode.com",
    weight: 5, // BACKUP: Reliable public node
    name: "PublicNode",
    tier: "fallback" as const,
    rateLimit: 50,
    rateLimitWindow: 10000
  },
  { 
    getUrl: () => "https://solana-mainnet.g.alchemy.com/v2/demo",
    weight: 3, // BACKUP: Demo endpoint, limited
    name: "Alchemy-Public",
    tier: "fallback" as const,
    rateLimit: 25,
    rateLimitWindow: 60000
  },
  { 
    getUrl: () => "https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ",
    weight: 2, // BACKUP: Phantom's public endpoint
    name: "Phantom-Public",
    tier: "fallback" as const,
    rateLimit: 15,
    rateLimitWindow: 10000
  },
  { 
    getUrl: () => "https://solana-rpc.debridge.finance",
    weight: 1, // BACKUP: Lowest priority
    name: "DeBridge",
    tier: "fallback" as const,
    rateLimit: 10,
    rateLimitWindow: 10000
  }
];

// ============================================================================
// FREE PUBLIC WEBSOCKET ENDPOINTS - For real-time subscriptions
// These are scarcer than HTTP endpoints but work without API keys
// ============================================================================
const FREE_WS_ENDPOINTS = [
  // Official Solana Labs WebSocket
  { url: "wss://api.mainnet-beta.solana.com", name: "Solana-Official", weight: 25 },
  
  // High-quality public WebSockets
  { url: "wss://solana-rpc.publicnode.com", name: "PublicNode-WS", weight: 20 },
  { url: "wss://solana.api.onfinality.io/public/ws", name: "OnFinality-WS", weight: 15 },
  { url: "wss://rpc.1rpc.io/solana/ws", name: "1RPC-WS", weight: 15 },
  
  // Community WebSockets
  { url: "wss://solana-mainnet.rpc.extrnode.com/ws", name: "Extrnode-WS", weight: 12 },
  { url: "wss://mainnet.helius-rpc.com", name: "Helius-Public-WS", weight: 10 },
  { url: "wss://solana.drpc.org", name: "dRPC-WS", weight: 10 },
  
  // Backup WebSockets
  { url: "wss://free.rpcpool.com", name: "RPCPool-WS", weight: 8 },
  { url: "wss://mainnet.rpcpool.com", name: "RPCPool-Main-WS", weight: 8 },
  { url: "wss://ssc-dao.genesysgo.net", name: "GenesysGo-WS", weight: 7 },
];

export class SolanaRpcBalancer {
  public providers: RpcProvider[];
  private totalWeight: number;
  private connectionPool: Map<string, Connection> = new Map();
  private poolSize = 3; // Max concurrent connections

  constructor(providers: typeof RPC_PROVIDERS) {
    // Filter out providers that require API keys but don't have them
    const availableProviders = providers.filter(p => {
      if ('requiresKey' in p && p.requiresKey && 'hasKey' in p) {
        const hasKey = p.hasKey();
        if (!hasKey) {
          console.log(`[RPC Balancer] Skipping ${p.name} - no API key configured`);
        }
        return hasKey;
      }
      return true;
    });
    
    const premiumCount = availableProviders.filter(p => p.tier === 'premium').length;
    const overflowCount = availableProviders.filter(p => p.tier === 'overflow').length;
    const fallbackCount = availableProviders.filter(p => p.tier === 'fallback').length;
    const wsCount = FREE_WS_ENDPOINTS.length;
    
    // Calculate traffic distribution
    const totalWeight = availableProviders.reduce((s, p) => s + p.weight, 0);
    const premiumWeight = availableProviders.filter(p => p.tier === 'premium').reduce((s, p) => s + p.weight, 0);
    const overflowWeight = availableProviders.filter(p => p.tier === 'overflow').reduce((s, p) => s + p.weight, 0);
    const fallbackWeight = availableProviders.filter(p => p.tier === 'fallback').reduce((s, p) => s + p.weight, 0);
    
    console.log(`[RPC Balancer] Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
    console.log(`[RPC Balancer] Tiers: ${premiumCount} premium, ${overflowCount} overflow, ${fallbackCount} fallback HTTP + ${wsCount} WebSocket`);
    console.log(`[RPC Balancer] Traffic distribution: Premium ${((premiumWeight / totalWeight) * 100).toFixed(0)}%, Overflow ${((overflowWeight / totalWeight) * 100).toFixed(0)}%, Fallback ${((fallbackWeight / totalWeight) * 100).toFixed(0)}%`);
    
    this.providers = availableProviders.map(p => ({
      ...p,
      score: 100,
      fails: 0,
      consecutiveFails: 0,
      avgLatency: 0,
      lastHealthCheck: 0,
      requestCount: 0,
      lastRequestTime: 0,
      rateLimitResetTime: 0,
      isRateLimited: false
    }));
    this.totalWeight = totalWeight;
  }

  select(): RpcProvider {
    const now = Date.now();
    
    // Reset rate limits for providers whose window has expired
    this.providers.forEach(p => {
      if (p.rateLimitResetTime && now > p.rateLimitResetTime) {
        p.requestCount = 0;
        p.isRateLimited = false;
        p.rateLimitResetTime = 0;
      }
    });
    
    // Filter out rate-limited providers
    const notRateLimited = this.providers.filter(p => !this.isProviderRateLimited(p));
    
    if (notRateLimited.length === 0) {
      console.log('[RPC Balancer] All providers rate limited, using least limited');
      // Find provider with the earliest reset time
      const leastLimited = this.providers.reduce((min, p) => 
        (p.rateLimitResetTime || 0) < (min.rateLimitResetTime || 0) ? p : min
      );
      return leastLimited;
    }
    
    // ============================================================================
    // TIERED SELECTION STRATEGY (Grok's Recommendations)
    // Priority: Premium (50-60%) -> Overflow/dRPC (15-20%) -> Public (5-10%)
    // ============================================================================
    
    // Tier 1: Premium providers (Helius, Shyft) - 50-60% of traffic
    const premiumHealthy = notRateLimited.filter(p => 
      p.tier === 'premium' && p.score > 70 && p.consecutiveFails < 3
    );
    
    // Tier 2: Overflow providers (dRPC) - 15-20% of traffic for burst/non-critical
    const overflowHealthy = notRateLimited.filter(p => 
      p.tier === 'overflow' && p.score > 60 && p.consecutiveFails < 4
    );
    
    // Tier 3: Public fallback providers - 5-10% of traffic for redundancy
    const fallbackHealthy = notRateLimited.filter(p => 
      p.tier === 'fallback' && p.score > 50 && p.consecutiveFails < 5
    );
    
    // Combine all healthy providers with their weights
    // The weights already encode the desired traffic distribution
    let candidates: RpcProvider[] = [];
    
    if (premiumHealthy.length > 0) {
      candidates = [...candidates, ...premiumHealthy];
    }
    if (overflowHealthy.length > 0) {
      candidates = [...candidates, ...overflowHealthy];
    }
    if (fallbackHealthy.length > 0) {
      candidates = [...candidates, ...fallbackHealthy];
    }
    
    // If no healthy providers, reset scores and try again
    if (candidates.length === 0) {
      console.log('[RPC Balancer] All providers unhealthy, resetting scores');
      this.providers.forEach(p => {
        p.score = p.tier === 'premium' ? 100 : p.tier === 'overflow' ? 90 : 80;
        p.consecutiveFails = 0;
      });
      candidates = this.providers.filter(p => p.tier === 'premium' || p.tier === 'overflow');
      if (candidates.length === 0) {
        candidates = this.providers;
      }
    }
    
    // Sort by combined score (health + speed bonus)
    candidates.sort((a, b) => {
      // Premium tier gets base boost, overflow gets smaller boost
      const tierBoost = { premium: 20, overflow: 10, fallback: 0 };
      const aScore = a.score + (a.avgLatency ? Math.max(0, 100 - a.avgLatency) : 50) + tierBoost[a.tier];
      const bScore = b.score + (b.avgLatency ? Math.max(0, 100 - b.avgLatency) : 50) + tierBoost[b.tier];
      return bScore - aScore;
    });
    
    // Weighted random selection based on configured weights
    // This ensures traffic distribution matches Grok's recommendations
    const weighted: RpcProvider[] = [];
    for (const p of candidates) {
      // Add provider to weighted pool based on its weight
      // Higher weight = more entries = more likely to be selected
      for (let j = 0; j < p.weight; j++) {
        weighted.push(p);
      }
    }
    
    const selected = weighted[Math.floor(Math.random() * weighted.length)];
    
    // Track request for rate limiting
    this.trackRequest(selected);
    
    console.log(`[RPC Balancer] Selected ${selected.name} (${selected.tier}) - score: ${selected.score}, latency: ${selected.avgLatency || 'unknown'}ms, requests: ${selected.requestCount}/${selected.rateLimit || 'unlimited'}`);
    return selected;
  }

  private isProviderRateLimited(provider: RpcProvider): boolean {
    if (!provider.rateLimit || !provider.rateLimitWindow) return false;
    
    const now = Date.now();
    
    // Check if we're within rate limit window
    if (provider.lastRequestTime && (now - provider.lastRequestTime) > provider.rateLimitWindow) {
      // Reset if window expired
      provider.requestCount = 0;
      provider.isRateLimited = false;
      provider.rateLimitResetTime = 0;
    }
    
    return (provider.requestCount || 0) >= provider.rateLimit;
  }

  private trackRequest(provider: RpcProvider): void {
    const now = Date.now();
    
    if (!provider.lastRequestTime || (now - provider.lastRequestTime) > (provider.rateLimitWindow || 60000)) {
      // Reset window
      provider.requestCount = 1;
      provider.lastRequestTime = now;
    } else {
      provider.requestCount = (provider.requestCount || 0) + 1;
    }
    
    // Check if we hit the rate limit
    if (provider.rateLimit && provider.requestCount >= provider.rateLimit) {
      provider.isRateLimited = true;
      provider.rateLimitResetTime = now + (provider.rateLimitWindow || 60000);
      console.log(`[RPC Balancer] ${provider.name} rate limited, reset at ${new Date(provider.rateLimitResetTime).toLocaleTimeString()}`);
    }
  }

  /**
   * Get a Helius-specific connection for index RPC methods
   * Index methods require premium RPC providers
   */
  getHeliusConnection(): Connection | null {
    const heliusUrl = getHeliusUrl();
    if (!heliusUrl) {
      console.warn('[RPC Balancer] Helius not available for index RPC methods');
      return null;
    }
    
    const cacheKey = `Helius-${heliusUrl}`;
    if (this.connectionPool.has(cacheKey)) {
      return this.connectionPool.get(cacheKey)!;
    }
    
    const { Connection } = require('@solana/web3.js');
    const connection = new Connection(heliusUrl, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
    });
    
    if (this.connectionPool.size < this.poolSize) {
      this.connectionPool.set(cacheKey, connection);
    }
    
    return connection;
  }

  getConnection(): Connection {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const provider = this.select();
        const url = provider.getUrl();
        
        // Use connection pooling for frequently used providers
        const cacheKey = `${provider.name}-${url}`;
        if (this.connectionPool.has(cacheKey)) {
          return this.connectionPool.get(cacheKey)!;
        }
        
        const connectionOptions: any = { 
          commitment: "confirmed",
          wsEndpoint: undefined,
          confirmTransactionInitialTimeout: 8000,
        };
        
        const connection = new Connection(url, connectionOptions);
        
        // Add to pool if under limit
        if (this.connectionPool.size < this.poolSize) {
          this.connectionPool.set(cacheKey, connection);
        }
        
        return connection;
        
      } catch (error: any) {
        attempts++;
        console.error(`[RPC Balancer] Connection attempt ${attempts} failed:`, error?.message || error);
        
        if (attempts >= maxAttempts) {
          // Fallback to most basic public endpoint
          const fallbackUrl = "https://api.mainnet-beta.solana.com";
          return new Connection(fallbackUrl, { commitment: "confirmed" });
        }
      }
    }
    
    // Should never reach here, but TypeScript safety
    throw new Error('Failed to establish RPC connection after all attempts');
  }

  // Get multiple connections for concurrent operations
  getMultipleConnections(count: number = 3): Connection[] {
    const connections: Connection[] = [];
    const usedProviders = new Set<string>();
    
    for (let i = 0; i < Math.min(count, this.providers.length); i++) {
      let provider = this.select();
      let attempts = 0;
      
      // Try to get different providers for true parallelism
      while (usedProviders.has(provider.name) && attempts < 5) {
        provider = this.select();
        attempts++;
      }
      
      usedProviders.add(provider.name);
      
      const connectionOptions: any = { 
        commitment: "confirmed",
        wsEndpoint: undefined
      };
      
      connections.push(new Connection(provider.getUrl(), connectionOptions));
    }
    
    return connections;
  }

  getHealthStats() {
    return this.providers.map(p => ({
      name: p.name,
      score: p.score,
      fails: p.fails,
      weight: p.weight,
    }));
  }

  /**
   * Get free WebSocket endpoints for real-time subscriptions
   * Returns array of WS URLs sorted by weight (reliability)
   */
  getFreeWsEndpoints(): { url: string; name: string; weight: number }[] {
    return [...FREE_WS_ENDPOINTS].sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get a single WebSocket endpoint (highest weighted)
   */
  getWsEndpoint(): string {
    // First try Helius if configured (paid has better WS limits)
    const heliusUrl = getHeliusUrl();
    if (heliusUrl) {
      // Convert HTTP to WSS
      return heliusUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    }
    
    // Otherwise return best free endpoint
    const sorted = this.getFreeWsEndpoints();
    return sorted.length > 0 ? sorted[0].url : "wss://api.mainnet-beta.solana.com";
  }

  /**
   * Get multiple WebSocket endpoints for rotation on disconnect
   */
  getRotatingWsEndpoints(count: number = 5): string[] {
    const sorted = this.getFreeWsEndpoints();
    return sorted.slice(0, count).map(e => e.url);
  }

  /**
   * Execute an RPC method with automatic failover and backoff
   * Tries multiple providers on failure with exponential backoff
   */
  async executeWithFailover<T>(
    method: (connection: Connection) => Promise<T>,
    options: { maxProviderAttempts?: number } = {}
  ): Promise<T> {
    const maxProviderAttempts = options.maxProviderAttempts ?? 3;
    const errors: Error[] = [];
    
    for (let providerAttempt = 0; providerAttempt < maxProviderAttempts; providerAttempt++) {
      const provider = this.select();
      const connection = this.getConnection();
      
      try {
        return await withExponentialBackoff(
          () => method(connection),
          {
            maxRetries: 2,
            onRetry: (attempt, error, delay) => {
              console.log(`[RPC Balancer] ${provider.name} retry ${attempt}: ${error.message} (waiting ${Math.round(delay)}ms)`);
            }
          }
        );
      } catch (error: any) {
        errors.push(error);
        console.log(`[RPC Balancer] ${provider.name} failed: ${error.message}. Trying next provider...`);
        
        // Mark provider as unhealthy
        provider.consecutiveFails++;
        provider.score = Math.max(0, provider.score - 20);
      }
    }
    
    throw new Error(`All ${maxProviderAttempts} providers failed. Last errors: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * Get comprehensive RPC health statistics
   */
  getDetailedStats() {
    const total = this.providers.length;
    const healthy = this.providers.filter(p => p.score > 70).length;
    const rateLimited = this.providers.filter(p => p.isRateLimited).length;
    const premium = this.providers.filter(p => p.tier === 'premium');
    const overflow = this.providers.filter(p => p.tier === 'overflow');
    const fallback = this.providers.filter(p => p.tier === 'fallback');
    
    // Calculate actual traffic distribution based on weights
    const totalWeight = this.providers.reduce((sum, p) => sum + p.weight, 0);
    const premiumWeight = premium.reduce((sum, p) => sum + p.weight, 0);
    const overflowWeight = overflow.reduce((sum, p) => sum + p.weight, 0);
    const fallbackWeight = fallback.reduce((sum, p) => sum + p.weight, 0);
    
    return {
      total,
      healthy,
      unhealthy: total - healthy,
      rateLimited,
      premiumCount: premium.length,
      premiumHealthy: premium.filter(p => p.score > 70).length,
      overflowCount: overflow.length,
      overflowHealthy: overflow.filter(p => p.score > 60).length,
      fallbackCount: fallback.length,
      fallbackHealthy: fallback.filter(p => p.score > 50).length,
      trafficDistribution: {
        premium: `${((premiumWeight / totalWeight) * 100).toFixed(1)}%`,
        overflow: `${((overflowWeight / totalWeight) * 100).toFixed(1)}%`,
        fallback: `${((fallbackWeight / totalWeight) * 100).toFixed(1)}%`
      },
      avgLatency: Math.round(
        this.providers.reduce((sum, p) => sum + (p.avgLatency || 0), 0) / total
      ),
      providers: this.providers.map(p => ({
        name: p.name,
        tier: p.tier,
        weight: p.weight,
        score: p.score,
        latency: p.avgLatency || 0,
        rateLimited: p.isRateLimited,
        fails: p.consecutiveFails
      }))
    };
  }
}

// Export singleton instance
export const rpcBalancer = new SolanaRpcBalancer(RPC_PROVIDERS);

// Enhanced health check with concurrent testing and latency measurement
const performHealthChecks = async () => {
  const healthChecks = rpcBalancer.providers.map(async (p) => {
    // Skip disabled providers
    if (p.weight === 0) {
      console.log(`⏭️ ${p.name}: Disabled (weight=0)`);
      return;
    }
    
    const startTime = Date.now();
    const url = p.getUrl();
    
    const conn = new Connection(url, { commitment: "confirmed", wsEndpoint: undefined });

    // Helper to race a promise with timeout
    const withTimeout = async <T>(promise: Promise<T>, ms = 5000): Promise<T> => {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
      return Promise.race([promise, timeoutPromise]) as Promise<T>;
    };

    try {
      // Primary: getSlot
      await withTimeout(conn.getSlot());
      const latency = Date.now() - startTime;
      p.avgLatency = p.avgLatency ? (p.avgLatency + latency) / 2 : latency;
      p.score = Math.min(100, p.score + 8);
      p.consecutiveFails = 0;
      p.lastHealthCheck = Date.now();
      if (latency < 500) {
        console.log(`✅ ${p.name}: ${latency}ms (excellent)`);
      } else if (latency < 1000) {
        console.log(`🟡 ${p.name}: ${latency}ms (good)`);
      } else {
        console.log(`🟠 ${p.name}: ${latency}ms (slow)`);
        p.score = Math.max(60, p.score - 5);
      }
      return;
    } catch (error: any) {
      // Fallback: some providers mis-shape getSlot; try getEpochInfo
      const primaryErr = error?.message || String(error);
      try {
        const t1 = Date.now();
        await withTimeout(conn.getEpochInfo());
        const latency = Date.now() - t1;
        p.avgLatency = p.avgLatency ? (p.avgLatency + latency) / 2 : latency;
        p.score = Math.min(95, p.score + 6);
        p.consecutiveFails = 0;
        p.lastHealthCheck = Date.now();
        console.log(`✅ ${p.name}: ${latency}ms via getEpochInfo`);
        return;
      } catch (fallbackErr: any) {
        const latency = Date.now() - startTime;
        p.consecutiveFails++;
        p.fails++;
        p.score = Math.max(0, p.score - 15);
        p.lastHealthCheck = Date.now();
        const msg = fallbackErr?.message || primaryErr;
        const errDetails = fallbackErr?.code || fallbackErr?.errno || fallbackErr?.type || '';
        console.log(`❌ ${p.name}: Failed (${msg}${errDetails ? ` [${errDetails}]` : ''}) - URL: ${url.substring(0, 60)}... - consecutive fails: ${p.consecutiveFails}`);
      }
    }
  });

  // Run health checks in batches of 3 to avoid 429 rate limits (reduced from 5)
  const batchSize = 3;
  for (let i = 0; i < healthChecks.length; i += batchSize) {
    const batch = healthChecks.slice(i, i + batchSize);
    await Promise.allSettled(batch);
    // Add 1 second delay between batches to avoid rate limits (increased from 500ms)
    if (i + batchSize < healthChecks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const healthyCount = rpcBalancer.providers.filter(p => p.score > 70).length;
  console.log(`[RPC Health] ${healthyCount}/${rpcBalancer.providers.length} providers healthy`);
};

// Run health checks every 2 minutes (reduced frequency to lower rate limit pressure)
setInterval(performHealthChecks, 120000);

// Initial health check after 10 seconds (increased to let server fully stabilize)
setTimeout(performHealthChecks, 10000);
