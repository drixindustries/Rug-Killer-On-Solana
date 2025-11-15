import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, TrendingUp } from "lucide-react";
import type { BundleDetectionData } from "@shared/schema";

interface BundleDetectionCardProps {
  data: BundleDetectionData | undefined;
}

export function BundleDetectionCard({ data }: BundleDetectionCardProps) {
  if (!data || data.bundleScore < 20) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bundle Detection
          </CardTitle>
          <CardDescription>Jito timing analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">No Bundle Activity Detected</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            No coordinated wallet patterns found
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityVariant = () => {
    if (data.bundleScore >= 60) return "destructive";
    if (data.bundleScore >= 35) return "secondary";
    return "default";
  };

  const getSeverityColor = () => {
    if (data.bundleScore >= 60) return "text-destructive";
    if (data.bundleScore >= 35) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card className={data.bundleScore >= 60 ? "border-destructive" : data.bundleScore >= 35 ? "border-yellow-500" : ""}>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${getSeverityColor()}`} />
            <span className="truncate">Bundle Detection</span>
          </CardTitle>
          <Badge variant={getSeverityVariant()} className="self-start sm:self-auto whitespace-nowrap">
            Score: {data.bundleScore}/100
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {data.bundleScore >= 60 ? "Critical bundle manipulation detected" : "Suspicious wallet patterns found"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Bundle Score Visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium">Bundle Risk</span>
            <span className={`text-base sm:text-lg font-bold ${getSeverityColor()}`}>
              {data.bundleScore}/100
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                data.bundleScore >= 60 ? 'bg-destructive' : 
                data.bundleScore >= 35 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${data.bundleScore}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Bundled Supply</p>
            <p className={`text-2xl font-bold ${data.bundledSupplyPercent > 30 ? 'text-destructive' : data.bundledSupplyPercent > 15 ? 'text-yellow-500' : ''}`}>
              {data.bundledSupplyPercent.toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Suspicious Wallets</p>
            <p className="text-2xl font-bold">{data.suspiciousWallets.length}</p>
          </div>
        </div>

        {/* Early Buy Cluster */}
        {data.earlyBuyCluster && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <div className="flex items-center gap-2 font-bold text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              Jito Bundle Detected
            </div>
            <p className="text-sm">
              {data.earlyBuyCluster.walletCount} wallets bought within {data.earlyBuyCluster.avgTimingGapMs}ms window
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jito bundles execute in &lt;400ms - this indicates coordinated manipulation
            </p>
          </div>
        )}

        {/* Risk Explanation */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Detected Patterns:</p>
          <ul className="space-y-1">
            {data.risks.map((risk, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {/* What This Means */}
        <div className="p-3 bg-muted rounded">
          <p className="text-sm font-medium mb-1">What This Means:</p>
          <p className="text-xs text-muted-foreground">
            {data.bundleScore >= 60 ? (
              <>
                <strong className="text-destructive">High Risk:</strong> This token shows strong signs of bundled wallet manipulation. 
                {data.suspiciousWallets.length} wallets controlling {data.bundledSupplyPercent.toFixed(1)}% of supply can coordinate dumps.
              </>
            ) : (
              <>
                <strong className="text-yellow-600 dark:text-yellow-400">Moderate Risk:</strong> Some suspicious wallet patterns detected. 
                Monitor {data.suspiciousWallets.length} wallets holding {data.bundledSupplyPercent.toFixed(1)}% combined supply.
              </>
            )}
          </p>
        </div>

        {/* Wallet Addresses (show first 3) */}
        {data.suspiciousWallets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suspicious Wallets (showing {Math.min(3, data.suspiciousWallets.length)} of {data.suspiciousWallets.length}):</p>
            <div className="space-y-1">
              {data.suspiciousWallets.slice(0, 3).map((wallet, i) => (
                <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">
                  {wallet.slice(0, 8)}...{wallet.slice(-8)}
                </code>
              ))}
              {data.suspiciousWallets.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{data.suspiciousWallets.length - 3} more wallets
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
