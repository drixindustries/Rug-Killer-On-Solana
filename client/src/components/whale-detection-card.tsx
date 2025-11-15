import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fish, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import type { WhaleDetectionData } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface WhaleDetectionCardProps {
  data: WhaleDetectionData | undefined;
  symbol: string;
}

export function WhaleDetectionCard({ data, symbol }: WhaleDetectionCardProps) {
  if (!data || data.whaleCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Whale Activity</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            No whale accumulation detected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Healthy distribution - no large early buys</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = () => {
    if (data.whaleCount >= 5 || data.totalWhaleSupplyPercent > 20) return "destructive";
    if (data.whaleCount >= 3 || data.totalWhaleSupplyPercent > 10) return "secondary";
    return "default";
  };

  const getSeverityIcon = () => {
    if (data.whaleCount >= 5 || data.totalWhaleSupplyPercent > 20) 
      return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />;
    if (data.whaleCount >= 3) 
      return <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />;
    return <Fish className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />;
  };

  return (
    <Card className={
      data.whaleCount >= 5 || data.totalWhaleSupplyPercent > 20 
        ? "border-destructive" 
        : data.whaleCount >= 3 
          ? "border-yellow-500" 
          : ""
    }>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {getSeverityIcon()}
            <span className="truncate">Whale Activity Detected</span>
          </CardTitle>
          <div className="flex gap-2 self-start sm:self-auto">
            <Badge variant={getSeverityColor()} className="whitespace-nowrap">
              {data.whaleCount} Whale{data.whaleCount > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="whitespace-nowrap">
              {data.totalWhaleSupplyPercent.toFixed(1)}% Supply
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {data.whaleCount >= 5 
            ? `Critical: ${data.whaleCount} large buyers accumulated ${data.totalWhaleSupplyPercent.toFixed(1)}% early`
            : `${data.whaleCount} whale${data.whaleCount > 1 ? 's' : ''} detected in first 10 minutes`
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Smart Insight */}
        {data.insight && (
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
            <p className="text-xs sm:text-sm whitespace-pre-line">{data.insight}</p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Supply</p>
            <p className="text-base sm:text-lg font-bold">{data.totalWhaleSupplyPercent.toFixed(2)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Buy Size</p>
            <p className="text-base sm:text-lg font-bold">{data.averageBuySize.toFixed(2)}%</p>
          </div>
        </div>

        {/* Largest Buy */}
        {data.largestBuy && (
          <div className="p-3 sm:p-4 bg-orange-500/10 border border-orange-500/50 rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Fish className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400">
                  Largest Buy
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {data.largestBuy.percentageOfSupply.toFixed(2)}%
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Wallet</span>
                <code className="font-mono text-xs">
                  {data.largestBuy.wallet.slice(0, 4)}...{data.largestBuy.wallet.slice(-4)}
                </code>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Time</span>
                <span>{formatDistanceToNow(new Date(data.largestBuy.timestamp * 1000), { addSuffix: true })}</span>
              </div>
              {data.largestBuy.isExchange && (
                <Badge variant="default" className="text-xs mt-1">
                  ✅ Exchange Wallet
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Whale List */}
        {data.whaleBuys.length > 0 && data.whaleBuys.length <= 5 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold">Whale Transactions</h4>
            <div className="space-y-2">
              {data.whaleBuys.map((whale, index) => (
                <div 
                  key={whale.txSignature} 
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0">#{index + 1}</span>
                    <code className="font-mono truncate">
                      {whale.wallet.slice(0, 6)}...{whale.wallet.slice(-4)}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {whale.percentageOfSupply.toFixed(2)}%
                    </Badge>
                    {whale.isExchange && (
                      <Badge variant="default" className="text-xs">CEX</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {data.risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold">Risk Analysis</h4>
            <ul className="space-y-1">
              {data.risks.map((risk, index) => (
                <li key={index} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                  <span className="shrink-0">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Recommendation */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Recommendation:</strong> {
              data.whaleCount >= 5
                ? "Monitor closely for coordinated dumps. Set tight stop-losses."
                : data.whaleCount >= 3
                  ? "Moderate whale presence. Watch price action carefully."
                  : "Limited whale exposure. Proceed with standard caution."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
