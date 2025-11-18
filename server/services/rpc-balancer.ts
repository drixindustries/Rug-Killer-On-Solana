import { Connection } from "@solana/web3.js";

interface RpcProvider {
  getUrl: () => string;
  weight: number;
  name: string;
  tier: 'premium' | 'fallback';
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
}

// Helper to safely read env vars even if a key was added with stray whitespace
function getEnv(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim() === key) return v as string;
  }
  return undefined;
}

// Build Ankr URL from env (PRIMARY RPC PROVIDER)
function getAnkrUrl(): string | undefined {
  let raw = getEnv('ANKR_RPC_URL')?.trim();
  const apiKey = getEnv('ANKR_API_KEY')?.trim();

  console.log('[Ankr Config] ANKR_RPC_URL present:', !!raw);
  console.log('[Ankr Config] ANKR_API_KEY present:', !!apiKey);

  // If only API key is provided or URL missing, construct the URL
  if ((!raw || raw.length === 0) && apiKey) {
    raw = `https://rpc.ankr.com/multichain/${apiKey.replace(/^\"|\"$/g, '')}`;
    console.log('[Ankr Config] Constructed URL from API key');
  }

  if (!raw) {
    console.log('[Ankr Config] No Ankr credentials found');
    return undefined;
  }

  // Strip accidental quotes and whitespace
  const cleaned = raw.replace(/^\"|\"$/g, '').trim();

  // If it looks like just a key, construct URL
  if (!cleaned.startsWith('http')) {
    return `https://rpc.ankr.com/multichain/${cleaned}`;
  }

  // Validate URL format and ensure https scheme
  try {
    const u = new URL(cleaned);
    if (u.protocol !== 'https:') {
      u.protocol = 'https:';
    }

    // If user pasted a multichain URL, it's already correct
    if (u.hostname.endsWith('rpc.ankr.com') && u.pathname.startsWith('/multichain/')) {
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.length > 16) {
        // Already in correct format
        return u.toString();
      } else if (apiKey) {
        u.pathname = `/solana/${apiKey.replace(/^\"|\"$/g, '')}`;
      } else {
        // If we cannot confidently extract a key, fail to undefined
        return undefined;
      }
    }
    const finalUrl = u.toString();
    console.log('[Ankr Config] Final Ankr URL configured:', finalUrl.substring(0, 40) + '...');
    return finalUrl;
  } catch (err) {
    console.error('[Ankr Config] Error parsing Ankr URL:', err);
    return undefined;
  }
}

// Build QuickNode URL from env (DEPRECATED - Use Ankr instead)
function getQuickNodeUrl(): string | undefined {
  const url = getEnv('QUICKNODE_RPC_URL')?.trim();
  
  console.log('[QuickNode Config] QUICKNODE_RPC_URL present (deprecated):', !!url);
  
  if (!url || url.length === 0) {
    return undefined;
  }

  // Strip quotes and whitespace
  const cleaned = url.replace(/^\"|\"$/g, '').trim();
  
  // Validate URL format
  try {
    const u = new URL(cleaned);
    if (u.protocol !== 'https:') {
      u.protocol = 'https:';
    }
    const finalUrl = u.toString();
    console.log('[QuickNode Config] QuickNode URL configured:', finalUrl.substring(0, 50) + '...');
    return finalUrl;
  } catch (err) {
    console.error('[QuickNode Config] Error parsing QuickNode URL:', err);
    return undefined;
  }
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

const RPC_PROVIDERS = [
  // Ankr Premium RPC (PRIMARY - highest priority)
  { 
    getUrl: () => `${getAnkrUrl() || ""}`,
    weight: 100, 
    name: "Ankr-Premium",
    tier: "premium" as const,
    requiresKey: true,
    hasKey: () => !!getAnkrUrl(),
    rateLimit: 1500,
    rateLimitWindow: 60000
  },
  // QuickNode Premium RPC (Secondary fallback)
  { 
    getUrl: () => `${getQuickNodeUrl() || ""}`,
    weight: 60, 
    name: "QuickNode",
    tier: "premium" as const,
    requiresKey: true,
    hasKey: () => !!getQuickNodeUrl(),
    rateLimit: 1000,
    rateLimitWindow: 60000
  },
  // Shyft Premium RPC (Tertiary fallback)
  { 
    getUrl: () => `${getShyftUrl() || ""}`,
    weight: 55, 
    name: "Shyft",
    tier: "premium" as const,
    requiresKey: true,
    hasKey: () => !!getShyftUrl(),
    rateLimit: 500,
    rateLimitWindow: 60000
  },
  // Fallback to public Solana RPC (Last resort)
  { 
    getUrl: () => "https://api.mainnet-beta.solana.com",
    weight: 30, 
    name: "Solana-Public",
    tier: "fallback" as const,
    rateLimit: 40,
    rateLimitWindow: 60000
  }
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
    const fallbackCount = availableProviders.filter(p => p.tier === 'fallback').length;
    
    console.log(`[RPC Balancer] Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
    console.log(`[RPC Balancer] ${premiumCount} premium, ${fallbackCount} fallback endpoints loaded`);
    
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
    this.totalWeight = availableProviders.reduce((s, p) => s + p.weight, 0);
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
    
    // Prefer premium tier providers that are healthy and not rate limited
    const premiumHealthy = notRateLimited.filter(p => p.tier === 'premium' && p.score > 70 && p.consecutiveFails < 3);
    const fallbackHealthy = notRateLimited.filter(p => p.tier === 'fallback' && p.score > 50 && p.consecutiveFails < 5);
    
    let candidates = premiumHealthy.length > 0 ? premiumHealthy : fallbackHealthy;
    
    if (candidates.length === 0) {
      console.log('[RPC Balancer] All providers unhealthy, resetting scores and using fallback');
      this.providers.forEach(p => {
        p.score = p.tier === 'premium' ? 100 : 80;
        p.consecutiveFails = 0;
      });
      candidates = this.providers.filter(p => p.tier === 'premium');
    }
    
    // Sort by combined score (health + speed)
    candidates.sort((a, b) => {
      const aScore = a.score + (a.avgLatency ? Math.max(0, 100 - a.avgLatency) : 50);
      const bScore = b.score + (b.avgLatency ? Math.max(0, 100 - b.avgLatency) : 50);
      return bScore - aScore;
    });
    
    // Weighted selection favoring top performers
    const weighted: RpcProvider[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const p = candidates[i];
      const weight = Math.max(1, p.weight * (candidates.length - i) / candidates.length);
      for (let j = 0; j < weight; j++) {
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
        
        const connection = new Connection(url, { 
          commitment: "confirmed",
          wsEndpoint: undefined, // Disable websocket for faster REST calls
          confirmTransactionInitialTimeout: 8000, // Reduced timeout
        });
        
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
      connections.push(new Connection(provider.getUrl(), { 
        commitment: "confirmed",
        wsEndpoint: undefined
      }));
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
}

// Export singleton instance
export const rpcBalancer = new SolanaRpcBalancer(RPC_PROVIDERS);

// Enhanced health check with concurrent testing and latency measurement
const performHealthChecks = async () => {
  const healthChecks = rpcBalancer.providers.map(async (p) => {
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
        console.log(`❌ ${p.name}: Failed (${msg}) - consecutive fails: ${p.consecutiveFails}`);
      }
    }
  });

  await Promise.allSettled(healthChecks);

  const healthyCount = rpcBalancer.providers.filter(p => p.score > 70).length;
  console.log(`[RPC Health] ${healthyCount}/${rpcBalancer.providers.length} providers healthy`);
};

// Run health checks every 20 seconds for faster failover
setInterval(performHealthChecks, 20000);

// Initial health check
setTimeout(performHealthChecks, 2000);
