import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Droplets, DollarSign, BarChart3 } from "lucide-react";
import type { DexScreenerData, DexScreenerPair } from "@shared/schema";

interface MarketDataCardProps {
  data: DexScreenerData;
  tokenAddress: string;
}

export function MarketDataCard({ data, tokenAddress }: MarketDataCardProps) {
  if (!data.pairs || data.pairs.length === 0) {
    return null;
  }

  const getMostLiquidPair = (): DexScreenerPair => {
    return data.pairs.reduce((prev, current) => {
      const prevLiq = prev.liquidity?.usd || 0;
      const currentLiq = current.liquidity?.usd || 0;
      return currentLiq > prevLiq ? current : prev;
    });
  };

  const mainPair = getMostLiquidPair();
  const priceUsd = parseFloat(mainPair.priceUsd || '0');
  const priceChange24h = mainPair.priceChange.h24;
  const volume24h = mainPair.volume.h24;
  const liquidity = mainPair.liquidity?.usd || 0;
  const marketCap = mainPair.marketCap || 0;
  const fdv = mainPair.fdv || 0;

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    } else if (value >= 1) {
      return `$${value.toFixed(2)}`;
    } else if (value > 0) {
      return `$${value.toFixed(8)}`;
    }
    return '$0.00';
  };

  const formatPrice = (value: number): string => {
    if (value >= 1) {
      return `$${value.toFixed(4)}`;
    } else if (value > 0) {
      const decimals = Math.max(2, -Math.floor(Math.log10(value)) + 2);
      return `$${value.toFixed(Math.min(decimals, 10))}`;
    }
    return '$0.00';
  };

  const isPriceUp = priceChange24h > 0;

  return (
    <Card className="p-6" data-testid="card-market-data">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Market Data</h3>
          <p className="text-sm text-muted-foreground">
            Powered by DexScreener • {mainPair.dexId}
          </p>
        </div>
        <Badge variant={isPriceUp ? "default" : "secondary"} className="gap-1">
          {isPriceUp ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground mb-1">Current Price</p>
          <p className="text-2xl font-bold font-mono" data-testid="market-price">
            {formatPrice(priceUsd)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {mainPair.baseToken.symbol} / {mainPair.quoteToken.symbol}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>24h Volume</span>
            </div>
            <div className="font-mono font-semibold" data-testid="market-volume">
              {formatCurrency(volume24h)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Droplets className="h-4 w-4" />
              <span>Liquidity</span>
            </div>
            <div className="font-mono font-semibold" data-testid="market-liquidity">
              {formatCurrency(liquidity)}
            </div>
          </div>

          {marketCap > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Market Cap</span>
              </div>
              <div className="font-mono font-semibold" data-testid="market-cap">
                {formatCurrency(marketCap)}
              </div>
            </div>
          )}

          {fdv > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>FDV</span>
              </div>
              <div className="font-mono font-semibold" data-testid="market-fdv">
                {formatCurrency(fdv)}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm font-semibold text-muted-foreground mb-2">24h Trading Activity</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-md">
              <span className="text-sm text-muted-foreground">Buys</span>
              <span className="font-mono font-semibold text-green-600" data-testid="market-buys">
                {mainPair.txns.h24.buys}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-md">
              <span className="text-sm text-muted-foreground">Sells</span>
              <span className="font-mono font-semibold text-red-600" data-testid="market-sells">
                {mainPair.txns.h24.sells}
              </span>
            </div>
          </div>
        </div>

        {data.pairs.length > 1 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Trading on {data.pairs.length} pair{data.pairs.length > 1 ? 's' : ''} across{' '}
              {new Set(data.pairs.map(p => p.dexId)).size} DEX{new Set(data.pairs.map(p => p.dexId)).size > 1 ? 'es' : ''}
            </p>
            <div className="flex gap-2 flex-wrap">
              {Array.from(new Set(data.pairs.map(p => p.dexId))).map(dexId => (
                <Badge key={dexId} variant="secondary" className="text-xs">
                  {dexId}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <a
            href={`https://dexscreener.com/solana/${mainPair.pairAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            data-testid="link-dexscreener"
          >
            View on DexScreener
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </Card>
  );
}

export default MarketDataCard;
