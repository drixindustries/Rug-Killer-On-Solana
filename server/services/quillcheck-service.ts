import type { QuillCheckData, HoneypotDetectionResult } from '../../shared/schema';
import { HoneypotDetector } from '../honeypot-detector';

interface QuillCacheEntry {
  data: QuillCheckData | null;
  honeypotDetection: HoneypotDetectionResult | null;
  fetchedAt: number;
}

const CACHE = new Map<string, QuillCacheEntry>();
const DEFAULT_TTL_MS = 60_000; // 1 minute cache – honeypot/tax unlikely to change rapidly

export class QuillCheckService {
  private apiUrl: string;
  private ttlMs: number;

  constructor(options?: { apiUrl?: string; ttlMs?: number }) {
    this.apiUrl = options?.apiUrl || process.env.QUILLCHECK_API_URL || 'https://check.quillai.network';
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  }

  private normalize(raw: any): QuillCheckData | null {
    if (!raw) return null;
    // Expected raw shape (best-effort): { riskScore, honeypot, buyTax, sellTax, canSell, liquidityRisk, risks }
    const riskScore = typeof raw.riskScore === 'number' ? raw.riskScore : (raw.score || 0);
    const isHoneypot = !!(raw.isHoneypot || raw.honeypot);
    const buyTax = Number(raw.buyTax ?? raw.buy_tax ?? 0);
    const sellTax = Number(raw.sellTax ?? raw.sell_tax ?? 0);
    const canSell = raw.canSell !== undefined ? !!raw.canSell : !isHoneypot;
    const liquidityRisk = !!(raw.liquidityRisk || raw.canDrainLiquidity || raw.liquidity_drain);
    const risks: string[] = Array.isArray(raw.risks) ? raw.risks : [];
    return {
      riskScore: Math.min(100, Math.max(0, riskScore)),
      isHoneypot,
      buyTax,
      sellTax,
      canSell,
      liquidityRisk,
      risks,
    };
  }

  async checkToken(tokenAddress: string): Promise<QuillCheckData | null> {
    const now = Date.now();
    const cached = CACHE.get(tokenAddress);
    if (cached && (now - cached.fetchedAt) < this.ttlMs) {
      return cached.data;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      
      // Add headers that might help avoid 403
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      };
      
      // Add API key if available
      if (process.env.QUILLCHECK_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.QUILLCHECK_API_KEY}`;
      }
      
      const res = await fetch(`${this.apiUrl}/api/scan/${tokenAddress}`, { 
        signal: controller.signal,
        headers 
      });
      clearTimeout(timeout);
      if (!res.ok) {
        console.warn(`[QuillCheck] API error ${res.status} - ${res.statusText}`);
        const entry: QuillCacheEntry = { data: null, honeypotDetection: null, fetchedAt: now };
        CACHE.set(tokenAddress, entry);
        return null;
      }
      const raw = await res.json();
      const normalized = this.normalize(raw);
      
      // Create enhanced honeypot detection from QuillCheck data
      let honeypotDetection: HoneypotDetectionResult | null = null;
      if (normalized) {
        honeypotDetection = HoneypotDetector.createQuickResult(
          normalized.isHoneypot,
          normalized.buyTax,
          normalized.sellTax,
          normalized.canSell
        );
      }
      
      CACHE.set(tokenAddress, { data: normalized, honeypotDetection, fetchedAt: now });
      return normalized;
    } catch (err) {
      if ((err as any).name === 'AbortError') {
        console.warn('[QuillCheck] Request timed out');
      } else {
        console.error('[QuillCheck] Fetch failed:', err);
      }
      CACHE.set(tokenAddress, { data: null, honeypotDetection: null, fetchedAt: now });
      return null;
    }
  }
  
  /**
   * Get cached honeypot detection result
   */
  async getHoneypotDetection(tokenAddress: string): Promise<HoneypotDetectionResult | null> {
    const now = Date.now();
    const cached = CACHE.get(tokenAddress);
    
    // If cached and fresh, return honeypot detection
    if (cached && (now - cached.fetchedAt) < this.ttlMs && cached.honeypotDetection) {
      return cached.honeypotDetection;
    }
    
    // Otherwise fetch fresh data
    const quillData = await this.checkToken(tokenAddress);
    const refreshedCache = CACHE.get(tokenAddress);
    return refreshedCache?.honeypotDetection || null;
  }
}

export const quillCheckService = new QuillCheckService();
