/**
 * Rate-Limited HTTP Request Handler
 * 
 * Features:
 * - Exponential backoff retry strategy
 * - Per-provider rate limit tracking
 * - Request queuing to prevent overwhelming APIs
 * - Circuit breaker pattern for failing providers
 * - Automatic retry with jitter
 * - Respects Retry-After headers
 */

interface RateLimitState {
  requests: number;
  windowStart: number;
  retryAfter?: number;
  consecutiveFailures: number;
  lastFailureTime?: number;
  circuitOpen: boolean;
  circuitOpenUntil?: number;
}

interface RequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  provider?: string; // Identifier for rate limit tracking (e.g., 'helius', 'shyft', 'discord')
  maxRetries?: number;
  timeout?: number;
  priority?: 'high' | 'normal' | 'low';
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in ms
  maxDelay: number; // Maximum delay in ms
  exponentialBase: number; // Multiplier for exponential backoff
  jitter: boolean; // Add random jitter to prevent thundering herd
}

class RateLimitedHttpClient {
  private rateLimitStore: Map<string, RateLimitState> = new Map();
  private requestQueues: Map<string, Array<() => Promise<any>>> = new Map();
  private processingQueues: Set<string> = new Set();
  
  // Default retry configuration
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 30000, // 30 seconds max
    exponentialBase: 2,
    jitter: true,
  };

  // Circuit breaker configuration
  private circuitBreakerConfig = {
    failureThreshold: 5, // Open circuit after 5 consecutive failures
    resetTimeout: 60000, // Try again after 60 seconds
    halfOpenMaxRequests: 3, // Allow 3 requests in half-open state
  };

  /**
   * Make an HTTP request with rate limiting and retry logic
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      provider = this.extractProviderFromUrl(url),
      maxRetries = this.defaultRetryConfig.maxRetries,
      timeout = 30000,
      priority = 'normal',
    } = options;

    // Check circuit breaker
    if (this.isCircuitOpen(provider)) {
      throw new Error(`Circuit breaker is open for provider: ${provider}. Please try again later.`);
    }

    // Check rate limits
    const rateLimitState = this.getRateLimitState(provider);
    if (this.isRateLimited(rateLimitState)) {
      // Queue the request instead of failing immediately
      return this.queueRequest(provider, priority, () => this.executeRequest<T>(options, maxRetries, timeout));
    }

    return this.executeRequest<T>(options, maxRetries, timeout);
  }

  /**
   * Execute the actual HTTP request with retry logic
   */
  private async executeRequest<T>(
    options: RequestOptions,
    maxRetries: number,
    timeout: number
  ): Promise<T> {
    const { url, method = 'GET', headers = {}, body, provider } = options;
    const rateLimitState = this.getRateLimitState(provider || this.extractProviderFromUrl(url));

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // Update rate limit tracking
        this.recordRequest(provider || this.extractProviderFromUrl(url));

        // Make the request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        };

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = this.extractRetryAfter(response);
          this.handleRateLimit(provider || this.extractProviderFromUrl(url), retryAfter);

          if (attempt < maxRetries) {
            const delay = this.calculateRetryDelay(attempt, retryAfter);
            console.error(`[RateLimit] Server responded with 429 Too Many Requests. Retrying after ${delay}ms delay... (attempt ${attempt + 1}/${maxRetries})`);
            await this.sleep(delay);
            attempt++;
            continue;
          } else {
            throw new Error(`Rate limit exceeded after ${maxRetries} retries. Retry-After: ${retryAfter || 'unknown'}`);
          }
        }

        // Handle other errors
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Success - reset failure tracking
        this.recordSuccess(provider || this.extractProviderFromUrl(url));

        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json() as T;
        }
        return await response.text() as T;

      } catch (error: any) {
        lastError = error;

        // Don't retry on abort (timeout) or non-retryable errors
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        // Retry on network errors or 5xx errors
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = this.calculateRetryDelay(attempt);
          console.error(`[RateLimit] Request failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying after ${delay}ms...`);
          await this.sleep(delay);
          attempt++;
        } else {
          // Record failure for circuit breaker
          this.recordFailure(provider || this.extractProviderFromUrl(url));
          throw error;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, retryAfter?: number): number {
    // Use Retry-After header if provided
    if (retryAfter) {
      return Math.min(retryAfter * 1000, this.defaultRetryConfig.maxDelay);
    }

    // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
    const exponentialDelay = this.defaultRetryConfig.baseDelay * 
      Math.pow(this.defaultRetryConfig.exponentialBase, attempt);

    // Add jitter to prevent thundering herd
    let delay = Math.min(exponentialDelay, this.defaultRetryConfig.maxDelay);
    if (this.defaultRetryConfig.jitter) {
      const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
      delay = delay + jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Extract Retry-After header from response
   */
  private extractRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
    }
    return undefined;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error.message?.includes('429')) return true;
    if (error.message?.includes('500') || error.message?.includes('502') || 
        error.message?.includes('503') || error.message?.includes('504')) return true;
    if (error.message?.includes('network') || error.message?.includes('ECONNRESET')) return true;
    return false;
  }

  /**
   * Get or create rate limit state for a provider
   */
  private getRateLimitState(provider: string): RateLimitState {
    if (!this.rateLimitStore.has(provider)) {
      this.rateLimitStore.set(provider, {
        requests: 0,
        windowStart: Date.now(),
        consecutiveFailures: 0,
        circuitOpen: false,
      });
    }
    return this.rateLimitStore.get(provider)!;
  }

  /**
   * Check if provider is currently rate limited
   */
  private isRateLimited(state: RateLimitState): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    // Reset window if expired
    if (now - state.windowStart > windowMs) {
      state.requests = 0;
      state.windowStart = now;
      state.retryAfter = undefined;
    }

    // Check if we have a retry-after delay
    if (state.retryAfter && now < state.retryAfter) {
      return true;
    }

    // Default rate limit: 30 requests per minute per provider
    // This can be customized per provider
    const maxRequests = this.getMaxRequestsForProvider(state);
    return state.requests >= maxRequests;
  }

  /**
   * Get max requests for a provider (can be customized)
   */
  private getMaxRequestsForProvider(state: RateLimitState): number {
    // Default: 30 requests per minute
    // Can be customized based on provider
    return 30;
  }

  /**
   * Record a request for rate limit tracking
   */
  private recordRequest(provider: string): void {
    const state = this.getRateLimitState(provider);
    const now = Date.now();
    const windowMs = 60000;

    if (now - state.windowStart > windowMs) {
      state.requests = 0;
      state.windowStart = now;
    }

    state.requests++;
  }

  /**
   * Handle rate limit response
   */
  private handleRateLimit(provider: string, retryAfter?: number): void {
    const state = this.getRateLimitState(provider);
    if (retryAfter) {
      state.retryAfter = Date.now() + (retryAfter * 1000);
    }
  }

  /**
   * Record successful request (for circuit breaker)
   */
  private recordSuccess(provider: string): void {
    const state = this.getRateLimitState(provider);
    state.consecutiveFailures = 0;
    
    // Close circuit if it was open
    if (state.circuitOpen) {
      state.circuitOpen = false;
      state.circuitOpenUntil = undefined;
      console.log(`[RateLimit] Circuit breaker closed for provider: ${provider}`);
    }
  }

  /**
   * Record failed request (for circuit breaker)
   */
  private recordFailure(provider: string): void {
    const state = this.getRateLimitState(provider);
    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();

    // Open circuit if threshold exceeded
    if (state.consecutiveFailures >= this.circuitBreakerConfig.failureThreshold && !state.circuitOpen) {
      state.circuitOpen = true;
      state.circuitOpenUntil = Date.now() + this.circuitBreakerConfig.resetTimeout;
      console.error(`[RateLimit] Circuit breaker opened for provider: ${provider} (${state.consecutiveFailures} consecutive failures)`);
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(provider: string): boolean {
    const state = this.getRateLimitState(provider);
    
    if (!state.circuitOpen) {
      return false;
    }

    // Check if we should try again (half-open state)
    if (state.circuitOpenUntil && Date.now() >= state.circuitOpenUntil) {
      // Allow a few requests to test if service is back
      if (state.consecutiveFailures < this.circuitBreakerConfig.halfOpenMaxRequests) {
        return false; // Half-open: allow requests
      }
    }

    return state.circuitOpen;
  }

  /**
   * Queue a request when rate limited
   */
  private async queueRequest<T>(
    provider: string,
    priority: 'high' | 'normal' | 'low',
    requestFn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.requestQueues.has(provider)) {
        this.requestQueues.set(provider, []);
      }

      const queue = this.requestQueues.get(provider)!;
      const queueItem = { priority, requestFn, resolve, reject };

      // Insert based on priority
      if (priority === 'high') {
        queue.unshift(queueItem);
      } else if (priority === 'low') {
        queue.push(queueItem);
      } else {
        // Insert after high priority items
        const firstLowIndex = queue.findIndex(item => item.priority === 'low');
        if (firstLowIndex === -1) {
          queue.push(queueItem);
        } else {
          queue.splice(firstLowIndex, 0, queueItem);
        }
      }

      // Start processing queue if not already processing
      if (!this.processingQueues.has(provider)) {
        this.processQueue(provider);
      }
    });
  }

  /**
   * Process queued requests for a provider
   */
  private async processQueue(provider: string): Promise<void> {
    this.processingQueues.add(provider);
    const queue = this.requestQueues.get(provider);

    while (queue && queue.length > 0) {
      const state = this.getRateLimitState(provider);
      
      // Wait if rate limited
      if (this.isRateLimited(state)) {
        const waitTime = state.retryAfter 
          ? Math.max(0, state.retryAfter - Date.now())
          : 1000; // Default 1 second wait
        
        if (waitTime > 0) {
          await this.sleep(waitTime);
          continue;
        }
      }

      // Process next request
      const item = queue.shift();
      if (item) {
        try {
          const result = await item.requestFn();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }

      // Small delay between requests to avoid overwhelming the API
      await this.sleep(100);
    }

    this.processingQueues.delete(provider);
  }

  /**
   * Extract provider identifier from URL
   */
  private extractProviderFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.includes('helius')) return 'helius';
      if (hostname.includes('shyft')) return 'shyft';
      if (hostname.includes('discord')) return 'discord';
      if (hostname.includes('solana')) return 'solana-rpc';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [provider, state] of this.rateLimitStore.entries()) {
      stats[provider] = {
        requests: state.requests,
        consecutiveFailures: state.consecutiveFailures,
        circuitOpen: state.circuitOpen,
        queuedRequests: this.requestQueues.get(provider)?.length || 0,
      };
    }
    
    return stats;
  }

  /**
   * Clear rate limit state (useful for testing or reset)
   */
  clearRateLimitState(provider?: string): void {
    if (provider) {
      this.rateLimitStore.delete(provider);
      this.requestQueues.delete(provider);
    } else {
      this.rateLimitStore.clear();
      this.requestQueues.clear();
    }
  }
}

// Singleton instance
let httpClientInstance: RateLimitedHttpClient | null = null;

export function getRateLimitedHttpClient(): RateLimitedHttpClient {
  if (!httpClientInstance) {
    httpClientInstance = new RateLimitedHttpClient();
  }
  return httpClientInstance;
}

// Export for direct use
export { RateLimitedHttpClient, RequestOptions };

