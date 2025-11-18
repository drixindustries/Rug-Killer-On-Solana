import { tokenAnalyzer } from '../solana-analyzer.ts';
import { streamMetrics } from './stream-metrics.ts';
import { RugcheckService } from '../rugcheck-service.ts';

export interface FullTokenMetrics {
  mint: string;
  analyzedAt: number;
  authorities: {
    mintAuthority: { hasAuthority: boolean; address: string | null; isRevoked: boolean };
    freezeAuthority: { hasAuthority: boolean; address: string | null; isRevoked: boolean };
  };
  supply: number | null;
  decimals: number | null;
  holders: {
    count: number;
    topConcentration: number;
  };
  liquidity: {
    exists: boolean;
    usd: number | null;
    pairs: Array<{
      dex: string;
      pairAddress: string;
      liquidityUsd: number;
      url?: string;
    }> | null;
    poolSharePercentApprox: number | null;
    lpBurnPercent?: number | null;
    lpLockedUsd?: number | null;
  };
  market: {
    priceUsd: number | null;
    fdv: number | null;
    marketCap: number | null;
    volume24h: number | null;
    priceChange24h: number | null;
  };
  activity: {
    txCount: number;
    uniqueWallets: number;
    lastSeen: number | null;
  };
  risk: {
    score: number;
    level: string;
    flags: Array<{ type: string; severity: string; title: string; description: string }>;
  };
  links: {
    dexscreener?: string;
    holders?: string;
    top20?: string;
    summary?: string;
  };
  sources: string[];
}

export class TokenMetricsService {
  private rug = new RugcheckService();
  async getFullMetrics(mint: string): Promise<FullTokenMetrics> {
    const [analysis, stream, rug] = await Promise.all([
      tokenAnalyzer.analyzeToken(mint),
      Promise.resolve(streamMetrics.getTokenSummary(mint)),
      this.rug.getTokenReport(mint).catch(() => null),
    ]);

    const pair = (analysis as any)?.dexScreenerData?.pairs?.[0];
    const liqUsd = pair?.liquidity?.usd ?? null;
    const baseReserve = pair?.liquidity?.base ?? null;
    const supply = (analysis as any)?.metadata?.supply ?? null;
    const poolSharePercentApprox = (baseReserve && supply) ? Math.max(0, Math.min(100, (baseReserve / supply) * 100)) : null;

    const links = this.buildLinks(mint);

    return {
      mint,
      analyzedAt: Date.now(),
      authorities: {
        mintAuthority: {
          hasAuthority: !!(analysis as any)?.mintAuthority?.hasAuthority,
          address: (analysis as any)?.mintAuthority?.authorityAddress || null,
          isRevoked: !!(analysis as any)?.mintAuthority?.isRevoked,
        },
        freezeAuthority: {
          hasAuthority: !!(analysis as any)?.freezeAuthority?.hasAuthority,
          address: (analysis as any)?.freezeAuthority?.authorityAddress || null,
          isRevoked: !!(analysis as any)?.freezeAuthority?.isRevoked,
        },
      },
      supply: supply,
      decimals: (analysis as any)?.metadata?.decimals ?? null,
      holders: {
        count: (analysis as any)?.holderCount ?? 0,
        topConcentration: (analysis as any)?.topHolderConcentration ?? 0,
      },
      liquidity: {
        exists: !!liqUsd && liqUsd > 0,
        usd: liqUsd,
        pairs: (analysis as any)?.dexScreenerData?.pairs?.map((p: any) => ({
          dex: p.dexId,
          pairAddress: p.pairAddress,
          liquidityUsd: p.liquidity?.usd || 0,
          url: p.url,
        })) || null,
        poolSharePercentApprox,
        lpBurnPercent: (() => {
          const lpVals = rug?.markets?.map((m: any) => m.lpBurn).filter((v: any) => typeof v === 'number');
          if (!lpVals || lpVals.length === 0) return null;
          return Math.max(...lpVals);
        })(),
        lpLockedUsd: (() => {
          const liqVals = rug?.markets?.map((m: any) => m.liquidity).filter((v: any) => typeof v === 'number');
          if (!liqVals || liqVals.length === 0) return null;
          return Math.max(...liqVals);
        })(),
      },
      market: {
        priceUsd: (analysis as any)?.marketData?.priceUsd ?? null,
        fdv: (analysis as any)?.marketData?.fdv ?? null,
        marketCap: (analysis as any)?.marketData?.marketCap ?? null,
        volume24h: (analysis as any)?.marketData?.volume24h ?? null,
        priceChange24h: (analysis as any)?.marketData?.priceChange24h ?? null,
      },
      activity: {
        txCount: stream?.txCount || 0,
        uniqueWallets: stream?.uniqueWallets || 0,
        lastSeen: stream?.lastSeen || null,
      },
      risk: {
        score: (analysis as any)?.riskScore ?? 0,
        level: (analysis as any)?.riskLevel ?? 'UNKNOWN',
        flags: (analysis as any)?.redFlags || [],
      },
      links,
      sources: this.collectSources(analysis, !!rug),
    };
  }

  private buildLinks(mint: string) {
    const base = process.env.PUBLIC_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null);
    const links: Record<string, string> = {};
    if (base) {
      links.holders = `${base}/api/holders/${mint}`;
      links.top20 = `${base}/api/holders/${mint}/top20`;
      links.summary = `${base}/api/holders/${mint}/summary`;
    }
    links.dexscreener = `https://dexscreener.com/solana/${mint}`;
    return links;
  }

  private collectSources(analysis: any, hasRugcheck: boolean): string[] {
    const sources = new Set<string>();
    if (analysis?.dexScreenerData) sources.add('dexscreener');
    if (analysis?.holderCount !== undefined) sources.add('holders');
    if (analysis?.marketData) sources.add('market');
    if (analysis?.riskLevel) sources.add('risk');
    if (hasRugcheck) sources.add('rugcheck');
    return Array.from(sources);
  }
}

export const tokenMetrics = new TokenMetricsService();
