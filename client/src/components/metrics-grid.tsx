import { Card } from "@/components/ui/card";
import { Users, Coins, Droplet, Calendar, TrendingUp, Wallet, AlertTriangle } from "lucide-react";

interface MetricsGridProps {
  totalSupply: number;
  holderCount: number;
  topHolderConcentration: number;
  liquidityStatus: string;
  creationDate?: number;
  decimals: number;
  bundledCount?: number;
  bundleConfidence?: 'low' | 'medium' | 'high';
}

export function MetricsGrid({
  totalSupply,
  holderCount,
  topHolderConcentration,
  liquidityStatus,
  creationDate,
  decimals,
  bundledCount = 0,
  bundleConfidence,
}: MetricsGridProps) {
  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getBundleSecondaryText = () => {
    if (bundledCount === 0) {
      return "No suspicious bundles detected";
    }
    if (bundleConfidence === 'high') {
      return `High confidence detection`;
    }
    if (bundleConfidence === 'medium') {
      return `Medium confidence detection`;
    }
    return `Low confidence detection`;
  };

  const metrics = [
    {
      icon: Coins,
      label: "Total Supply",
      value: formatNumber(totalSupply / Math.pow(10, decimals)),
      secondary: `${decimals} decimals`,
      testId: "metric-total-supply",
    },
    {
      icon: Users,
      label: "Holder Count",
      value: holderCount.toLocaleString(),
      secondary: "unique addresses",
      testId: "metric-holder-count",
    },
    {
      icon: TrendingUp,
      label: "Top Holder Concentration",
      value: `${topHolderConcentration.toFixed(1)}%`,
      secondary: "top 10 wallets",
      testId: "metric-concentration",
    },
    {
      icon: AlertTriangle,
      label: "Bundled Wallets",
      value: bundledCount.toLocaleString(),
      secondary: getBundleSecondaryText(),
      testId: "metric-bundled-wallets",
      warning: bundledCount > 0,
    },
    {
      icon: Droplet,
      label: "Liquidity Pool",
      value: liquidityStatus,
      secondary: "LP status",
      testId: "metric-liquidity",
    },
    {
      icon: Calendar,
      label: "Creation Date",
      value: creationDate ? new Date(creationDate).toLocaleDateString() : "Unknown",
      secondary: creationDate ? getTimeAgo(creationDate) : "",
      testId: "metric-creation-date",
    },
  ];

  function getTimeAgo(timestamp: number) {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isWarning = 'warning' in metric && metric.warning;
        return (
          <Card 
            key={metric.label} 
            className={`p-6 ${isWarning ? 'border-orange-500/50' : ''}`}
            data-testid={metric.testId}
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-md ${isWarning ? 'bg-orange-500/10' : 'bg-primary/10'}`}>
                <Icon className={`h-5 w-5 ${isWarning ? 'text-orange-500' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {metric.label}
                </p>
                <p className={`text-xl font-semibold mt-1 ${isWarning ? 'text-orange-500' : ''}`} data-testid={`${metric.testId}-value`}>
                  {metric.value}
                </p>
                {metric.secondary && (
                  <p className={`text-xs mt-1 ${isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
                    {metric.secondary}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
