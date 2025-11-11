import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export interface VanityOptions {
  pattern: string;
  matchType: 'prefix' | 'suffix' | 'contains';
  caseSensitive?: boolean;
  maxAttempts?: number;
}

export interface VanityResult {
  publicKey: string;
  secretKey: string; // base58 encoded
  attempts: number;
  timeMs: number;
}

export class VanityAddressGenerator {
  private stopped = false;

  stop() {
    this.stopped = true;
  }

  async generate(
    options: VanityOptions,
    onProgress?: (attempts: number, timeMs: number) => void
  ): Promise<VanityResult | null> {
    const { pattern, matchType, caseSensitive = false, maxAttempts = 10_000_000 } = options;
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();
    
    let attempts = 0;
    const startTime = Date.now();
    this.stopped = false;

    // Progress callback every 10,000 attempts
    const progressInterval = 10_000;

    while (attempts < maxAttempts && !this.stopped) {
      attempts++;

      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toBase58();
      const checkKey = caseSensitive ? publicKey : publicKey.toLowerCase();

      let matches = false;
      if (matchType === 'prefix') {
        matches = checkKey.startsWith(searchPattern);
      } else if (matchType === 'suffix') {
        matches = checkKey.endsWith(searchPattern);
      } else {
        matches = checkKey.includes(searchPattern);
      }

      if (matches) {
        const timeMs = Date.now() - startTime;
        return {
          publicKey,
          secretKey: bs58.encode(keypair.secretKey),
          attempts,
          timeMs,
        };
      }

      // Progress callback
      if (onProgress && attempts % progressInterval === 0) {
        const timeMs = Date.now() - startTime;
        onProgress(attempts, timeMs);
      }
    }

    // No match found within max attempts
    return null;
  }

  /**
   * Estimates how long it might take to find a vanity address
   * Based on the pattern length and match type
   */
  static estimateDifficulty(pattern: string, matchType: 'prefix' | 'suffix' | 'contains'): {
    difficulty: number;
    estimatedAttempts: string;
    estimatedTime: string;
  } {
    const base58Chars = 58;
    let difficulty: number;

    if (matchType === 'prefix' || matchType === 'suffix') {
      // For prefix/suffix: 58^length
      difficulty = Math.pow(base58Chars, pattern.length);
    } else {
      // For contains: roughly 58^length / length (because pattern can appear anywhere)
      difficulty = Math.pow(base58Chars, pattern.length) / pattern.length;
    }

    // Rough estimates assuming ~100k attempts/sec on average hardware
    const attemptsPerSec = 100_000;
    const estimatedSeconds = difficulty / attemptsPerSec;

    let estimatedTime: string;
    if (estimatedSeconds < 1) {
      estimatedTime = '< 1 second';
    } else if (estimatedSeconds < 60) {
      estimatedTime = `~${Math.round(estimatedSeconds)} seconds`;
    } else if (estimatedSeconds < 3600) {
      estimatedTime = `~${Math.round(estimatedSeconds / 60)} minutes`;
    } else if (estimatedSeconds < 86400) {
      estimatedTime = `~${Math.round(estimatedSeconds / 3600)} hours`;
    } else {
      estimatedTime = `~${Math.round(estimatedSeconds / 86400)} days`;
    }

    let estimatedAttempts: string;
    if (difficulty < 1000) {
      estimatedAttempts = Math.round(difficulty).toString();
    } else if (difficulty < 1_000_000) {
      estimatedAttempts = `${(difficulty / 1000).toFixed(1)}K`;
    } else if (difficulty < 1_000_000_000) {
      estimatedAttempts = `${(difficulty / 1_000_000).toFixed(1)}M`;
    } else {
      estimatedAttempts = `${(difficulty / 1_000_000_000).toFixed(1)}B`;
    }

    return {
      difficulty,
      estimatedAttempts,
      estimatedTime,
    };
  }
}
