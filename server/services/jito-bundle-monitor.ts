/**
 * Jito Bundle Monitor Service
 * Real-time detection and tracking of Jito MEV bundles
 * 
 * Features:
 * - Real-time bundle result streaming
 * - Bundle status tracking (accepted, processed, finalized, rejected, dropped)
 * - Transaction-to-bundle mapping
 * - MEV tip detection and analysis
 * - Historical bundle status checking
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { EventEmitter } from 'events';

// Official Jito tip accounts (updated regularly from getTipAccounts())
export const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

// =============================================================================
// PHOTON MEV PROTECTION DETECTION (Dec 2025)
// Photon uses Jito's protected bundles with high tips for MEV resistance
// =============================================================================

// Photon typically uses higher tips (>0.001 SOL) for priority MEV protection
export const PHOTON_TIP_THRESHOLD_LAMPORTS = 1_000_000; // 0.001 SOL in lamports
export const PHOTON_TIP_THRESHOLD_SOL = 0.001;

// Risk adjustment: Photon protection can be used by legit projects OR by rugs
// If combined with other red flags, it's likely evasion; otherwise neutral
export const PHOTON_RISK_ADJUSTMENT = {
  withHighRisk: 0.8,    // Reduce risk slightly (could be legit MEV protection)
  withLowRisk: 1.0,     // No adjustment for clean projects
};

// =============================================================================
// JITO BUNDLE SUBMISSION CONFIGURATION
// For MEV-protected transaction submissions (e.g., safe test buys)
// =============================================================================

export interface BundleSubmissionConfig {
  tipAmountSol: number;      // Tip amount in SOL (default 0.001 for Photon-like)
  maxRetries: number;        // Max retries on failure
  pollIntervalMs: number;    // Status poll interval
  timeoutMs: number;         // Total timeout for confirmation
}

export const DEFAULT_BUNDLE_CONFIG: BundleSubmissionConfig = {
  tipAmountSol: 0.001,       // Photon-like tip for priority
  maxRetries: 3,
  pollIntervalMs: 3000,      // 3 seconds
  timeoutMs: 30000,          // 30 seconds total
};

export interface BundleSubmissionResult {
  success: boolean;
  bundleId?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout' | 'invalid';
  tipAmountSol: number;
  photonProtected: boolean;
  error?: string;
  txSignatures?: string[];
};

export type BundleStatus = 
  | 'ACCEPTED'      // Forwarded to validator
  | 'PROCESSED'     // Reached processed commitment
  | 'FINALIZED'     // Confirmed on-chain ✅
  | 'REJECTED'      // Not forwarded (bid too low, simulation failed)
  | 'DROPPED'       // Accepted but didn't land
  | 'UNKNOWN';

export interface BundleData {
  bundleId: string;
  status: BundleStatus;
  slot?: number;
  validatorIdentity?: string;
  tipAmount?: number;
  tipAccount?: string;
  transactions?: string[];
  rejectionReason?: {
    type: 'state_auction' | 'winning_batch' | 'simulation_failure' | 'internal_error';
    message?: string;
    auctionId?: string;
    simulatedBidLamports?: number;
    txSignature?: string;
  };
  droppedReason?: 'blockhash_expired' | 'partially_processed' | 'not_finalized';
  timestamp: number;
}

export interface JitoBundleDetection {
  isBundle: boolean;
  bundleId?: string;
  status?: BundleStatus;
  tipAmount?: number;
  tipAmountSol?: number; // Tip in SOL for easier reading
  tipAccount?: string;
  tipPayer?: string; // Wallet that paid for the bundle (fee payer)
  slotLanded?: number;
  validatorIdentity?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Photon MEV Protection Detection (Dec 2025)
  photonProtected?: boolean; // High tip indicates Photon-like protection
  photonRiskAdjustment?: number; // Risk multiplier based on Photon detection
  
  signals: {
    hasJitoTip: boolean;
    tipAccountMatch: boolean;
    consecutiveTxsInSlot: boolean;
    highPriorityFee: boolean;
    isPhotonLikeTip: boolean; // Tip > 0.001 SOL threshold
  };
  
  // Warning message for display
  warning?: string;
}

// SyraxAI-style bundle transfer detection
export interface BundleTransferDetection {
  hasBundleTransfers: boolean;
  transfers: Array<{
    fromWallet: string;
    toWallet: string;
    percentage: number;
    timestamp: number;
    txSignature: string;
    isPostLaunch: boolean; // Transfer happened after launch
    timeSinceLaunch: number; // Seconds since token launch
  }>;
  totalTransferredPercent: number;
  suspiciousTransferCount: number;
  patterns: {
    consolidationDetected: boolean; // Multiple wallets → single wallet
    distributionDetected: boolean; // Single wallet → multiple wallets
    rapidTransfers: boolean; // Transfers within 5 minutes of launch
    largeTransfers: boolean; // Any transfer >5% supply
  };
  riskScore: number; // 0-100
  risks: string[];
}

export class JitoBundleMonitor extends EventEmitter {
  private connection: Connection;
  private bundleCache: Map<string, BundleData>;
  private transactionToBundleMap: Map<string, string>;
  private monitoringActive: boolean = false;
  private blockEngineUrl: string = 'https://mainnet.block-engine.jito.wtf';

  constructor(connection: Connection) {
    super();
    this.connection = connection;
    this.bundleCache = new Map();
    this.transactionToBundleMap = new Map();
    
    console.log('[JitoBundleMonitor] Initialized');
  }

  /**
   * Start monitoring bundle results
   * Note: This requires jito-ts SDK to be installed
   * For now, this is a placeholder for the integration
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      console.log('[JitoBundleMonitor] Already monitoring');
      return;
    }

    this.monitoringActive = true;
    console.log('[JitoBundleMonitor] Starting bundle monitoring...');

    // TODO: Implement with jito-ts when installed
    // const client = searcherClient(this.blockEngineUrl, authKeypair);
    // const cancelStream = client.onBundleResult(
    //   (bundleResult) => this.handleBundleResult(bundleResult),
    //   (error) => console.error('[JitoBundleMonitor] Stream error:', error)
    // );

    this.emit('monitoring-started');
  }

  /**
   * Stop monitoring bundle results
   */
  stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('[JitoBundleMonitor] Stopped monitoring');
    this.emit('monitoring-stopped');
  }

  /**
   * Detect if a transaction is part of a Jito bundle
   * This works without streaming by analyzing transaction structure
   * 
   * Enhanced with:
   * - Photon MEV protection detection (high tip > 0.001 SOL)
   * - Robust error handling for RPC errors, timeouts
   * - Safe defaults on failure
   */
  async detectBundleFromTransaction(
    signature: string,
    transaction?: any,
    timeoutMs: number = 10000
  ): Promise<JitoBundleDetection> {
    // Default safe result for errors
    const safeDefault: JitoBundleDetection = {
      isBundle: false,
      confidence: 'LOW',
      photonProtected: false,
      signals: {
        hasJitoTip: false,
        tipAccountMatch: false,
        consecutiveTxsInSlot: false,
        highPriorityFee: false,
        isPhotonLikeTip: false,
      },
    };

    try {
      // Fetch transaction if not provided with timeout
      if (!transaction) {
        const fetchPromise = this.connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        // Add timeout wrapper
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Transaction fetch timeout')), timeoutMs);
        });
        
        try {
          transaction = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (fetchError: any) {
          console.warn(`[JitoBundleMonitor] Fetch timeout/error for ${signature}: ${fetchError.message}`);
          return safeDefault;
        }
      }

      if (!transaction) {
        return safeDefault;
      }

      // Analyze transaction for bundle signals
      const signals = {
        hasJitoTip: false,
        tipAccountMatch: false,
        consecutiveTxsInSlot: false,
        highPriorityFee: false,
        isPhotonLikeTip: false,
      };

      let tipAmount = 0;
      let tipAmountSol = 0;
      let tipAccount: string | undefined;
      let tipPayer: string | undefined;
      let slotLanded: number | undefined;
      let photonProtected = false;

      // Check for Jito tip transfer
      if (transaction.meta?.postBalances && transaction.transaction?.message?.accountKeys) {
        const accountKeys = transaction.transaction.message.accountKeys.map((k: any) => 
          typeof k === 'string' ? k : k.toBase58()
        );

        // Fee payer is typically the first account (signer)
        if (accountKeys.length > 0) {
          tipPayer = accountKeys[0];
        }

        for (let i = 0; i < accountKeys.length; i++) {
          const account = accountKeys[i];
          if (JITO_TIP_ACCOUNTS.includes(account)) {
            signals.hasJitoTip = true;
            signals.tipAccountMatch = true;
            
            // Calculate tip amount
            const preBalance = transaction.meta.preBalances[i] || 0;
            const postBalance = transaction.meta.postBalances[i] || 0;
            tipAmount = postBalance - preBalance;
            tipAmountSol = tipAmount / 1e9; // Convert lamports to SOL
            tipAccount = account;
            slotLanded = transaction.slot;
            
            // PHOTON DETECTION: High tip indicates Photon-like MEV protection
            if (tipAmount >= PHOTON_TIP_THRESHOLD_LAMPORTS) {
              signals.isPhotonLikeTip = true;
              photonProtected = true;
              console.log(`[JitoBundleMonitor] Photon-like tip detected: ${tipAmountSol.toFixed(6)} SOL (>${PHOTON_TIP_THRESHOLD_SOL} SOL threshold)`);
            }
            
            console.log(`[JitoBundleMonitor] Detected Jito tip: ${tipAmount} lamports (${tipAmountSol.toFixed(6)} SOL) to ${account} from ${tipPayer}`);
          }
        }
      }

      // Check for high priority fee (common in bundles)
      if (transaction.meta?.fee && transaction.meta.fee > 10000) {
        signals.highPriorityFee = true;
      }

      // Check if this is part of a known bundle
      const bundleId = this.transactionToBundleMap.get(signature);
      let bundleStatus: BundleStatus | undefined;
      
      if (bundleId) {
        const bundleData = this.bundleCache.get(bundleId);
        bundleStatus = bundleData?.status;
      }

      // Determine confidence level
      let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (signals.hasJitoTip && signals.tipAccountMatch) {
        confidence = 'HIGH';
      } else if (signals.hasJitoTip || signals.highPriorityFee) {
        confidence = 'MEDIUM';
      }

      const isBundle = signals.hasJitoTip || bundleId !== undefined;
      
      // Generate warning message
      let warning: string | undefined;
      if (isBundle) {
        warning = 'Coordinated launch detected—potential insider bundling';
        if (photonProtected) {
          warning += ' with Photon MEV protection';
        }
      }

      return {
        isBundle,
        bundleId,
        status: bundleStatus,
        tipAmount: tipAmount > 0 ? tipAmount : undefined,
        tipAmountSol: tipAmountSol > 0 ? tipAmountSol : undefined,
        tipAccount,
        tipPayer: signals.hasJitoTip ? tipPayer : undefined,
        slotLanded,
        confidence,
        photonProtected,
        photonRiskAdjustment: photonProtected ? PHOTON_RISK_ADJUSTMENT.withHighRisk : 1.0,
        signals,
        warning,
      };
    } catch (error: any) {
      // Robust error handling - log and return safe defaults
      const errorType = error.name || 'UnknownError';
      const errorMessage = error.message || 'Unknown error';
      
      if (errorType === 'TypeError' || errorMessage.includes('timeout')) {
        console.warn(`[JitoBundleMonitor] RPC timeout for ${signature}`);
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        console.warn(`[JitoBundleMonitor] Rate limited on ${signature}`);
      } else {
        console.error(`[JitoBundleMonitor] Error detecting bundle (${errorType}): ${errorMessage}`);
      }
      
      return safeDefault;
    }
  }

  /**
   * Check multiple transactions for bundle patterns
   * Useful for detecting bundle activity in token launches
   */
  async detectBundleActivity(
    signatures: string[]
  ): Promise<{
    hasBundleActivity: boolean;
    bundleCount: number;
    totalTipAmount: number;
    detections: JitoBundleDetection[];
  }> {
    const detections = await Promise.all(
      signatures.map(sig => this.detectBundleFromTransaction(sig))
    );

    const bundles = detections.filter(d => d.isBundle);
    const totalTipAmount = bundles.reduce((sum, b) => sum + (b.tipAmount || 0), 0);

    return {
      hasBundleActivity: bundles.length > 0,
      bundleCount: bundles.length,
      totalTipAmount,
      detections,
    };
  }

  /**
   * Track a specific bundle by ID
   */
  trackBundle(bundleId: string, transactions?: string[]): void {
    if (!this.bundleCache.has(bundleId)) {
      this.bundleCache.set(bundleId, {
        bundleId,
        status: 'UNKNOWN',
        transactions,
        timestamp: Date.now(),
      });

      // Map transactions to bundle
      if (transactions) {
        transactions.forEach(tx => {
          this.transactionToBundleMap.set(tx, bundleId);
        });
      }
    }
  }

  /**
   * Get bundle data by ID
   */
  getBundleData(bundleId: string): BundleData | undefined {
    return this.bundleCache.get(bundleId);
  }

  /**
   * Check if a transaction is part of a tracked bundle
   */
  getTransactionBundle(signature: string): string | undefined {
    return this.transactionToBundleMap.get(signature);
  }

  /**
   * Handle bundle result from stream (when jito-ts is integrated)
   */
  private handleBundleResult(result: any): void {
    const bundleData: BundleData = {
      bundleId: result.bundleId,
      status: this.parseBundleStatus(result),
      timestamp: Date.now(),
    };

    // Extract status-specific data
    if (result.accepted) {
      bundleData.slot = result.accepted.slot;
      bundleData.validatorIdentity = result.accepted.validatorIdentity;
    }

    if (result.processed) {
      bundleData.slot = result.processed.slot;
      bundleData.validatorIdentity = result.processed.validatorIdentity;
    }

    if (result.rejected) {
      bundleData.rejectionReason = this.parseRejectionReason(result.rejected);
    }

    if (result.dropped) {
      bundleData.droppedReason = this.parseDroppedReason(result.dropped.reason);
    }

    // Update cache
    this.bundleCache.set(bundleData.bundleId, bundleData);

    // Emit event for listeners
    this.emit('bundle-update', bundleData);

    console.log(`[JitoBundleMonitor] Bundle ${bundleData.bundleId}: ${bundleData.status}`);
  }

  /**
   * Parse bundle status from result
   */
  private parseBundleStatus(result: any): BundleStatus {
    if (result.finalized) return 'FINALIZED';
    if (result.processed) return 'PROCESSED';
    if (result.accepted) return 'ACCEPTED';
    if (result.rejected) return 'REJECTED';
    if (result.dropped) return 'DROPPED';
    return 'UNKNOWN';
  }

  /**
   * Parse rejection reason
   */
  private parseRejectionReason(rejected: any): BundleData['rejectionReason'] {
    if (rejected.stateAuctionBidRejected) {
      return {
        type: 'state_auction',
        auctionId: rejected.stateAuctionBidRejected.auctionId,
        simulatedBidLamports: rejected.stateAuctionBidRejected.simulatedBidLamports,
        message: rejected.stateAuctionBidRejected.msg,
      };
    }

    if (rejected.winningBatchBidRejected) {
      return {
        type: 'winning_batch',
        auctionId: rejected.winningBatchBidRejected.auctionId,
        simulatedBidLamports: rejected.winningBatchBidRejected.simulatedBidLamports,
        message: rejected.winningBatchBidRejected.msg,
      };
    }

    if (rejected.simulationFailure) {
      return {
        type: 'simulation_failure',
        txSignature: rejected.simulationFailure.txSignature,
        message: rejected.simulationFailure.msg,
      };
    }

    if (rejected.internalError) {
      return {
        type: 'internal_error',
        message: rejected.internalError.msg,
      };
    }

    return undefined;
  }

  /**
   * Parse dropped reason
   */
  private parseDroppedReason(reason: number): BundleData['droppedReason'] {
    switch (reason) {
      case 0: return 'blockhash_expired';
      case 1: return 'partially_processed';
      case 2: return 'not_finalized';
      default: return undefined;
    }
  }

  /**
   * SyraxAI-style bundle transfer detection
   * Detects when bundled supply is transferred post-launch to evade detection
   * Threshold: >5% supply transfer = suspicious
   */
  async detectBundleTransfers(
    tokenAddress: string,
    topHolders: Array<{ address: string; percentage: number }>,
    launchTimestamp?: number
  ): Promise<BundleTransferDetection> {
    const transfers: BundleTransferDetection['transfers'] = [];
    const risks: string[] = [];
    let totalTransferredPercent = 0;
    let suspiciousTransferCount = 0;
    const patterns = {
      consolidationDetected: false,
      distributionDetected: false,
      rapidTransfers: false,
      largeTransfers: false,
    };

    try {
      const mintPubkey = new PublicKey(tokenAddress);
      
      // Get recent token transactions
      const signatures = await this.connection.getSignaturesForAddress(
        mintPubkey,
        { limit: 100 },
        'confirmed'
      );

      if (signatures.length === 0) {
        return this.createEmptyTransferResult();
      }

      // Use oldest signature as launch time if not provided
      const effectiveLaunchTime = launchTimestamp || 
        (signatures[signatures.length - 1]?.blockTime || 0) * 1000;

      // Track transfers per wallet
      const incomingTransfers = new Map<string, number>();
      const outgoingTransfers = new Map<string, number>();

      // Analyze each transaction for token transfers
      for (const sig of signatures.slice(0, 50)) { // Limit to 50 for performance
        try {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta?.postTokenBalances || !tx.meta.preTokenBalances) continue;

          const blockTime = (tx.blockTime || 0) * 1000;
          const timeSinceLaunch = (blockTime - effectiveLaunchTime) / 1000;
          const isPostLaunch = timeSinceLaunch > 30; // >30 seconds after launch

          // Find token transfers by comparing pre/post balances
          const preBalances = new Map<string, number>();
          const postBalances = new Map<string, number>();

          for (const pre of tx.meta.preTokenBalances) {
            if (pre.mint === tokenAddress && pre.owner) {
              preBalances.set(pre.owner, Number(pre.uiTokenAmount?.uiAmount || 0));
            }
          }

          for (const post of tx.meta.postTokenBalances) {
            if (post.mint === tokenAddress && post.owner) {
              postBalances.set(post.owner, Number(post.uiTokenAmount?.uiAmount || 0));
            }
          }

          // Detect transfers
          for (const [owner, postAmount] of postBalances) {
            const preAmount = preBalances.get(owner) || 0;
            const diff = postAmount - preAmount;

            if (Math.abs(diff) > 0.01) { // Ignore dust
              const percentage = Math.abs(diff) / 1000000000 * 100; // Assuming 1B supply
              
              if (diff > 0) {
                // Incoming transfer
                incomingTransfers.set(owner, (incomingTransfers.get(owner) || 0) + 1);
                
                if (percentage > 5 && isPostLaunch) {
                  transfers.push({
                    fromWallet: 'unknown',
                    toWallet: owner,
                    percentage,
                    timestamp: blockTime,
                    txSignature: sig.signature,
                    isPostLaunch,
                    timeSinceLaunch,
                  });
                  totalTransferredPercent += percentage;
                  
                  if (percentage > 5) {
                    patterns.largeTransfers = true;
                    suspiciousTransferCount++;
                  }
                  
                  if (timeSinceLaunch < 300) { // Within 5 minutes
                    patterns.rapidTransfers = true;
                  }
                }
              } else {
                // Outgoing transfer
                outgoingTransfers.set(owner, (outgoingTransfers.get(owner) || 0) + 1);
              }
            }
          }
        } catch {
          continue; // Skip failed transaction fetches
        }
      }

      // Detect consolidation pattern (many → one)
      for (const [wallet, count] of incomingTransfers) {
        if (count >= 5) {
          patterns.consolidationDetected = true;
          risks.push(`Consolidation detected: ${wallet.slice(0, 8)}... received ${count} transfers`);
        }
      }

      // Detect distribution pattern (one → many)
      for (const [wallet, count] of outgoingTransfers) {
        if (count >= 5) {
          patterns.distributionDetected = true;
          risks.push(`Distribution detected: ${wallet.slice(0, 8)}... sent ${count} transfers`);
        }
      }

      // Generate risk signals
      if (patterns.largeTransfers) {
        risks.push(`Large transfers detected (>${5}% supply moved post-launch)`);
      }
      if (patterns.rapidTransfers) {
        risks.push('Rapid post-launch transfers (<5 minutes) - potential bundle evasion');
      }
      if (patterns.consolidationDetected && patterns.largeTransfers) {
        risks.push('🚨 Bundle transfer pattern: Large amounts consolidated to single wallet');
      }

      // Calculate risk score
      let riskScore = 0;
      if (patterns.largeTransfers) riskScore += 30;
      if (patterns.rapidTransfers) riskScore += 25;
      if (patterns.consolidationDetected) riskScore += 25;
      if (patterns.distributionDetected) riskScore += 10;
      riskScore += Math.min(10, suspiciousTransferCount * 2);

      return {
        hasBundleTransfers: suspiciousTransferCount > 0 || patterns.consolidationDetected,
        transfers,
        totalTransferredPercent,
        suspiciousTransferCount,
        patterns,
        riskScore: Math.min(100, riskScore),
        risks,
      };

    } catch (error) {
      console.error('[JitoBundleMonitor] Error detecting bundle transfers:', error);
      return this.createEmptyTransferResult();
    }
  }

  /**
   * Create empty transfer detection result
   */
  private createEmptyTransferResult(): BundleTransferDetection {
    return {
      hasBundleTransfers: false,
      transfers: [],
      totalTransferredPercent: 0,
      suspiciousTransferCount: 0,
      patterns: {
        consolidationDetected: false,
        distributionDetected: false,
        rapidTransfers: false,
        largeTransfers: false,
      },
      riskScore: 0,
      risks: [],
    };
  }

  /**
   * Get statistics about detected bundles
   */
  getStatistics(): {
    totalBundles: number;
    statusBreakdown: Record<BundleStatus, number>;
    averageTipAmount: number;
  } {
    const bundles = Array.from(this.bundleCache.values());
    
    const statusBreakdown: Record<BundleStatus, number> = {
      ACCEPTED: 0,
      PROCESSED: 0,
      FINALIZED: 0,
      REJECTED: 0,
      DROPPED: 0,
      UNKNOWN: 0,
    };

    let totalTips = 0;
    let tipCount = 0;

    bundles.forEach(bundle => {
      statusBreakdown[bundle.status]++;
      
      if (bundle.tipAmount) {
        totalTips += bundle.tipAmount;
        tipCount++;
      }
    });

    return {
      totalBundles: bundles.length,
      statusBreakdown,
      averageTipAmount: tipCount > 0 ? totalTips / tipCount : 0,
    };
  }

  /**
   * Submit a protected bundle via Jito for MEV-safe transactions
   * 
   * This method allows submitting atomic transaction bundles with tips for priority.
   * Useful for safe test buys that are front-run protected.
   * 
   * WARNING: This costs real SOL for tips. Only use for bot actions.
   * 
   * @param transactions - Array of serialized transaction bytes (1-5 txs)
   * @param config - Bundle submission configuration (tip amount, retries, etc.)
   * @returns BundleSubmissionResult with status and bundle ID
   * 
   * Example usage:
   * ```typescript
   * const result = await bundleMonitor.submitProtectedBundle(
   *   [serializedTx1, serializedTx2],
   *   { tipAmountSol: 0.001 }
   * );
   * ```
   */
  async submitProtectedBundle(
    transactions: Uint8Array[],
    config: Partial<BundleSubmissionConfig> = {}
  ): Promise<BundleSubmissionResult> {
    const finalConfig = { ...DEFAULT_BUNDLE_CONFIG, ...config };
    
    // Validate transaction count (Jito supports 1-5 txs per bundle)
    if (transactions.length === 0 || transactions.length > 5) {
      console.error('[JitoBundleMonitor] Invalid bundle: must have 1-5 transactions');
      return {
        success: false,
        status: 'invalid',
        tipAmountSol: finalConfig.tipAmountSol,
        photonProtected: finalConfig.tipAmountSol >= PHOTON_TIP_THRESHOLD_SOL,
        error: 'Jito bundles must contain 1-5 transactions',
      };
    }
    
    console.log(`[JitoBundleMonitor] Submitting protected bundle with ${transactions.length} txs, tip: ${finalConfig.tipAmountSol} SOL`);
    
    try {
      // Note: In production, this would use the Jito SDK (jito-ts)
      // For now, we use the Block Engine HTTP API
      
      const blockEngineUrl = `${this.blockEngineUrl}/api/v1/bundles`;
      
      // Build bundle request
      const bundleRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [
          transactions.map(tx => Buffer.from(tx).toString('base64')),
          {
            encoding: 'base64',
            // Tip is typically included in the last transaction
          }
        ],
      };
      
      // Submit bundle with retries
      let lastError: string | undefined;
      
      for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
        try {
          const response = await fetch(blockEngineUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bundleRequest),
          });
          
          if (!response.ok) {
            lastError = `HTTP ${response.status}: ${response.statusText}`;
            console.warn(`[JitoBundleMonitor] Bundle submission attempt ${attempt + 1} failed: ${lastError}`);
            continue;
          }
          
          const result = await response.json();
          
          if (result.error) {
            lastError = result.error.message || 'Unknown Jito error';
            console.warn(`[JitoBundleMonitor] Bundle rejected: ${lastError}`);
            continue;
          }
          
          const bundleId = result.result;
          
          if (bundleId) {
            console.log(`[JitoBundleMonitor] Bundle submitted: ${bundleId}`);
            
            // Poll for confirmation
            const confirmed = await this.pollBundleConfirmation(
              bundleId,
              finalConfig.pollIntervalMs,
              finalConfig.timeoutMs
            );
            
            // Track in cache
            this.bundleCache.set(bundleId, {
              bundleId,
              status: confirmed ? 'FINALIZED' : 'ACCEPTED',
              tipAmount: finalConfig.tipAmountSol * 1e9, // Convert to lamports
              timestamp: Date.now(),
            });
            
            return {
              success: confirmed,
              bundleId,
              status: confirmed ? 'confirmed' : 'pending',
              tipAmountSol: finalConfig.tipAmountSol,
              photonProtected: finalConfig.tipAmountSol >= PHOTON_TIP_THRESHOLD_SOL,
            };
          }
          
        } catch (fetchError: any) {
          lastError = fetchError.message || 'Network error';
          console.warn(`[JitoBundleMonitor] Network error on attempt ${attempt + 1}: ${lastError}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // All retries failed
      return {
        success: false,
        status: 'failed',
        tipAmountSol: finalConfig.tipAmountSol,
        photonProtected: finalConfig.tipAmountSol >= PHOTON_TIP_THRESHOLD_SOL,
        error: lastError || 'Max retries exceeded',
      };
      
    } catch (error: any) {
      console.error('[JitoBundleMonitor] Bundle submission error:', error.message);
      return {
        success: false,
        status: 'failed',
        tipAmountSol: finalConfig.tipAmountSol,
        photonProtected: finalConfig.tipAmountSol >= PHOTON_TIP_THRESHOLD_SOL,
        error: error.message,
      };
    }
  }
  
  /**
   * Poll for bundle confirmation status
   * 
   * @param bundleId - The bundle ID to poll
   * @param intervalMs - Polling interval in milliseconds
   * @param timeoutMs - Total timeout in milliseconds
   * @returns true if confirmed, false if timeout/failed
   */
  private async pollBundleConfirmation(
    bundleId: string,
    intervalMs: number,
    timeoutMs: number
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const statusUrl = `${this.blockEngineUrl}/api/v1/bundles`;
        
        const statusRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]],
        };
        
        const response = await fetch(statusUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(statusRequest),
        });
        
        if (response.ok) {
          const result = await response.json();
          const statuses = result.result?.value || [];
          
          if (statuses.length > 0) {
            const status = statuses[0];
            
            if (status.confirmation_status === 'finalized' || 
                status.confirmation_status === 'confirmed') {
              console.log(`[JitoBundleMonitor] Bundle ${bundleId} confirmed!`);
              return true;
            }
            
            if (status.err) {
              console.warn(`[JitoBundleMonitor] Bundle ${bundleId} failed: ${JSON.stringify(status.err)}`);
              return false;
            }
          }
        }
        
      } catch (pollError) {
        // Continue polling on errors
        console.debug('[JitoBundleMonitor] Poll error (continuing):', pollError);
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    console.warn(`[JitoBundleMonitor] Bundle ${bundleId} confirmation timeout`);
    return false;
  }

  /**
   * Clear old bundle data (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    for (const [bundleId, data] of this.bundleCache.entries()) {
      if (data.timestamp < oneHourAgo) {
        this.bundleCache.delete(bundleId);
        
        // Clean up transaction mappings
        if (data.transactions) {
          data.transactions.forEach(tx => {
            this.transactionToBundleMap.delete(tx);
          });
        }
      }
    }
  }
}

// Singleton instance
let bundleMonitorInstance: JitoBundleMonitor | null = null;

export function getBundleMonitor(connection: Connection): JitoBundleMonitor {
  if (!bundleMonitorInstance) {
    bundleMonitorInstance = new JitoBundleMonitor(connection);
    
    // Auto-cleanup every 30 minutes
    setInterval(() => {
      bundleMonitorInstance?.cleanup();
    }, 30 * 60 * 1000);
  }
  
  return bundleMonitorInstance;
}
