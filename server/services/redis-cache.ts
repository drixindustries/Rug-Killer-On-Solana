/**
 * Redis Cache Service - Lightning Fast Token Analysis
 * 
 * Caches:
 * - Birdeye prices & overview (30s)
 * - GMGN data (60s) 
 * - Solana RPC token data (2min)
 * - Token analysis results (5min)
 * 
 * Compatible with Railway Redis add-on
 */

import Redis from 'ioredis';

class RedisCache {
  private redis: Redis | null = null;
  private isConnected: boolean = false;
  private isEnabled: boolean = false;
  private connectionAttempted: boolean = false;
  private errorCount: number = 0;
  private maxErrors: number = 3;

  constructor() {
    // Only enable Redis if explicitly configured
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    
    if (!redisUrl) {
      console.log('[Redis] Not configured - caching disabled (set REDIS_URL to enable)');
      this.isEnabled = false;
      return;
    }

    this.isEnabled = true;
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
      this.isConnected = true;
      this.errorCount = 0;
    });

    this.redis.on('error', (error) => {
      this.errorCount++;
      if (this.errorCount <= this.maxErrors) {
        console.error('[Redis] Connection error:', error.message);
      }
      if (this.errorCount === this.maxErrors) {
        console.log('[Redis] Max errors reached - silencing further Redis errors');
      }
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      if (this.isConnected) {
        console.log('[Redis] Connection closed');
      }
      this.isConnected = false;
    });
  }

  /**
   * Cache fetch with automatic JSON serialization
   */
  async cacheFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    expiresInSeconds: number = 300
  ): Promise<T> {
    // Skip cache if disabled or too many errors
    if (!this.isEnabled || !this.redis || this.errorCount >= this.maxErrors) {
      return await fetchFn();
    }

    try {
      if (!this.isConnected && !this.connectionAttempted) {
        this.connectionAttempted = true;
        await this.redis.connect();
      }

      // Try to get cached value
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch fresh data
      const value = await fetchFn();
      
      // Cache the result (don't await to avoid blocking)
      this.redis.setex(key, expiresInSeconds, JSON.stringify(value)).catch(() => {});
      
      return value;
    } catch (error) {
      // Silently fallback to direct fetch
      return await fetchFn();
    }
  }

  /**
   * Set cache value directly
   */
  async set(key: string, value: any, expiresInSeconds: number = 300): Promise<void> {
    if (!this.isEnabled || !this.redis || this.errorCount >= this.maxErrors) return;
    
    try {
      if (!this.isConnected && !this.connectionAttempted) {
        this.connectionAttempted = true;
        await this.redis.connect();
      }
      await this.redis.setex(key, expiresInSeconds, JSON.stringify(value));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cache value directly
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis || this.errorCount >= this.maxErrors) return null;
    
    try {
      if (!this.isConnected && !this.connectionAttempted) {
        this.connectionAttempted = true;
        await this.redis.connect();
      }
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    if (!this.isEnabled || !this.redis || this.errorCount >= this.maxErrors) return;
    
    try {
      if (!this.isConnected && !this.connectionAttempted) {
        this.connectionAttempted = true;
        await this.redis.connect();
      }
      await this.redis.del(key);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Clear all cache (development only)
   */
  async clearAll(): Promise<void> {
    if (!this.isEnabled || !this.redis) return;
    
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
      await this.redis.flushdb();
      console.log('[Redis] Cache cleared');
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ keys: number; memory: string; hits: number; misses: number }> {
    if (!this.isEnabled || !this.redis) {
      return { keys: 0, memory: 'Disabled', hits: 0, misses: 0 };
    }
    
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
      
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse stats from Redis info
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'Unknown';
      const keys = keyspace.includes('db0') ? 
        parseInt(keyspace.match(/db0:keys=(\d+)/)?.[1] || '0') : 0;

      return { keys, memory, hits, misses };
    } catch (error) {
      return { keys: 0, memory: 'Error', hits: 0, misses: 0 };
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Global singleton instance
export const redisCache = new RedisCache();