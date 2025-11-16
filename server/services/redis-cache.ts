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
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    // Auto-detect Railway Redis or local dev
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('[Redis] Connection error:', error);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      console.log('[Redis] Connection closed');
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
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }

      // Try to get cached value
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch fresh data
      const value = await fetchFn();
      
      // Cache the result
      await this.redis.setex(key, expiresInSeconds, JSON.stringify(value));
      
      return value;
    } catch (error) {
      console.error(`[Redis] Cache error for key ${key}:`, error);
      // Fallback to direct fetch if Redis fails
      return await fetchFn();
    }
  }

  /**
   * Set cache value directly
   */
  async set(key: string, value: any, expiresInSeconds: number = 300): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
      await this.redis.setex(key, expiresInSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`[Redis] Set error for key ${key}:`, error);
    }
  }

  /**
   * Get cache value directly
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`[Redis] Get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
      await this.redis.del(key);
    } catch (error) {
      console.error(`[Redis] Delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache (development only)
   */
  async clearAll(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.redis.connect();
      }
      await this.redis.flushdb();
      console.log('[Redis] Cache cleared');
    } catch (error) {
      console.error('[Redis] Clear error:', error);
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ keys: number; memory: string; hits: number; misses: number }> {
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
      console.error('[Redis] Stats error:', error);
      return { keys: 0, memory: 'Unknown', hits: 0, misses: 0 };
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Global singleton instance
export const redisCache = new RedisCache();