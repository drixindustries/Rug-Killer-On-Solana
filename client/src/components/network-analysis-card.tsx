import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Network, TrendingUp } from "lucide-react";
import type { NetworkAnalysisData } from "@shared/schema";

interface NetworkAnalysisCardProps {
  data: NetworkAnalysisData | undefined;
}

export function NetworkAnalysisCard({ data }: NetworkAnalysisCardProps) {
  if (!data || data.networkRiskScore < 20) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Analysis
          </CardTitle>
          <CardDescription>Wallet clustering by Bubblemaps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">Normal Distribution</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            No suspicious wallet clustering detected
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityVariant = () => {
    if (data.networkRiskScore >= 60) return "destructive";
    if (data.networkRiskScore >= 35) return "secondary";
    return "default";
  };

  const getSeverityColor = () => {
    if (data.networkRiskScore >= 60) return "text-destructive";
    if (data.networkRiskScore >= 35) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <Card className={data.networkRiskScore >= 60 ? "border-destructive" : data.networkRiskScore >= 35 ? "border-yellow-500" : ""}>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertTriangle className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${getSeverityColor()}`} />
            <span className="truncate">Network Analysis</span>
          </CardTitle>
          <Badge variant={getSeverityVariant()} className="self-start sm:self-auto whitespace-nowrap">
            Risk: {data.networkRiskScore}/100
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {data.networkRiskScore >= 60 ? "Coordinated wallet control detected" : "Suspicious clustering patterns"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Network Risk Visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium">Network Risk</span>
            <span className={`text-base sm:text-lg font-bold ${getSeverityColor()}`}>
              {data.networkRiskScore}/100
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                data.networkRiskScore >= 60 ? 'bg-destructive' : 
                data.networkRiskScore >= 35 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${data.networkRiskScore}%` }}
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Clustered Wallets</p>
            <p className="text-2xl font-bold">{data.clusteredWallets}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Connected Groups</p>
            <p className="text-2xl font-bold">{data.connectedGroups.length}</p>
          </div>
        </div>

        {/* Connected Groups */}
        {data.connectedGroups.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Connected Groups:</p>
            {data.connectedGroups.slice(0, 3).map((group, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                group.totalSupplyPercent > 20 ? 'bg-destructive/10 border-destructive' : 'bg-muted border-border'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Group {i + 1}</span>
                  <Badge variant={group.totalSupplyPercent > 20 ? "destructive" : "secondary"}>
                    {(typeof group.totalSupplyPercent === 'number' ? group.totalSupplyPercent.toFixed(1) : '0.0')}% supply
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {group.wallets.length} wallets appear to be controlled by the same entity
                </p>
                {group.totalSupplyPercent > 20 && (
                  <p className="text-xs text-destructive mt-1 font-medium">
                    ⚠️ This group controls significant supply - dump coordination risk
                  </p>
                )}
              </div>
            ))}
            {data.connectedGroups.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{data.connectedGroups.length - 3} more groups
              </p>
            )}
          </div>
        )}

        {/* Total Supply in Clusters */}
        {data.connectedGroups.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Clustered Supply</span>
              <span className={`text-xl font-bold ${
                data.connectedGroups.reduce((sum, g) => sum + g.totalSupplyPercent, 0) > 40 ? 'text-destructive' : 
                data.connectedGroups.reduce((sum, g) => sum + g.totalSupplyPercent, 0) > 25 ? 'text-yellow-500' : ''
              }`}>
                {(() => {
                  const total = data.connectedGroups.reduce((sum, g) => sum + (g.totalSupplyPercent || 0), 0);
                  return (typeof total === 'number' ? total.toFixed(1) : '0.0');
                })()}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of supply held by connected wallet groups
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
            {data.networkRiskScore >= 60 ? (
              <>
                <strong className="text-destructive">High Risk:</strong> Multiple wallet clusters detected with coordinated control patterns. 
                These {data.clusteredWallets} wallets can coordinate dumps or price manipulation.
              </>
            ) : (
              <>
                <strong className="text-yellow-600 dark:text-yellow-400">Moderate Risk:</strong> Some wallet clustering detected. 
                {data.clusteredWallets} wallets show connection patterns that warrant monitoring.
              </>
            )}
          </p>
        </div>

        {/* Bubblemaps Attribution */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Network analysis powered by <a href="https://bubblemaps.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Bubblemaps</a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
