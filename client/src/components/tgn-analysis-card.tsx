import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Network, Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { TGNResult } from "@shared/schema";

interface TGNAnalysisCardProps {
  tgnResult: TGNResult;
  isPreMigration?: boolean;
  migrationDetected?: boolean;
  systemWalletsFiltered?: number;
}

export function TGNAnalysisCard({ tgnResult, isPreMigration, migrationDetected, systemWalletsFiltered }: TGNAnalysisCardProps) {
  const rugPercent = (typeof tgnResult.rugProbability === 'number' ? (tgnResult.rugProbability * 100).toFixed(1) : '0.0');
  const confidencePercent = (typeof tgnResult.confidence === 'number' ? (tgnResult.confidence * 100).toFixed(0) : '0');
  
  // Determine risk level and color
  let riskLevel = "LOW";
  let riskColor = "text-green-500";
  let riskBg = "bg-green-500/10";
  let RiskIcon = CheckCircle;
  
  if (tgnResult.rugProbability > 0.70) {
    riskLevel = "HIGH";
    riskColor = "text-red-500";
    riskBg = "bg-red-500/10";
    RiskIcon = AlertTriangle;
  } else if (tgnResult.rugProbability > 0.40) {
    riskLevel = "MODERATE";
    riskColor = "text-yellow-500";
    riskBg = "bg-yellow-500/10";
    RiskIcon = AlertTriangle;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle>Temporal GNN Analysis</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
            F1: 0.966
          </Badge>
        </div>
        <CardDescription>
          Advanced temporal graph neural network detection with 96.6% accuracy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Risk Score */}
        <div className={`p-6 rounded-lg ${riskBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <RiskIcon className={`w-8 h-8 ${riskColor}`} />
              <div>
                <p className="text-sm text-muted-foreground">Rug Probability</p>
                <p className={`text-3xl font-bold ${riskColor}`}>{rugPercent}%</p>
              </div>
            </div>
            <Badge variant={riskLevel === "LOW" ? "default" : riskLevel === "MODERATE" ? "secondary" : "destructive"}>
              {riskLevel} RISK
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>Analysis Confidence: {confidencePercent}%</span>
          </div>
        </div>

        {/* Migration Status */}
        {(isPreMigration || migrationDetected) && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <p className="font-medium">Migration Status</p>
            </div>
            {isPreMigration && (
              <p className="text-sm text-muted-foreground">
                ⏳ <strong>Pre-Migration:</strong> Token on Pump.fun bonding curve. Risk score relaxed until Raydium migration.
              </p>
            )}
            {migrationDetected && (
              <p className="text-sm text-muted-foreground">
                🔄 <strong>Recently Migrated:</strong> Token graduated to Raydium LP. Full analysis active.
              </p>
            )}
          </div>
        )}

        {/* Graph Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Graph Structure</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wallets:</span>
                <span className="font-mono font-semibold">{tgnResult.graphMetrics.nodeCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transactions:</span>
                <span className="font-mono font-semibold">{tgnResult.graphMetrics.edgeCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg Degree:</span>
                <span className="font-mono font-semibold">{(typeof tgnResult.graphMetrics.avgDegree === 'number' ? tgnResult.graphMetrics.avgDegree.toFixed(2) : '0.00')}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Network Density</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Density Score:</span>
                <span className="font-mono font-semibold">{(typeof tgnResult.graphMetrics.densityScore === 'number' ? tgnResult.graphMetrics.densityScore.toFixed(3) : '0.000')}</span>
              </div>
              {systemWalletsFiltered !== undefined && systemWalletsFiltered > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Filtered:</span>
                  <span className="font-mono font-semibold">{systemWalletsFiltered}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detected Patterns */}
        {tgnResult.patterns.length > 0 && (
          <div className="space-y-3">
            <p className="font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Detected Patterns ({tgnResult.patterns.length})
            </p>
            <div className="space-y-2">
              {tgnResult.patterns.slice(0, 5).map((pattern, idx) => {
                const patternEmoji = pattern.type === 'migration_event' ? '🔄' :
                                    pattern.type === 'star_dump' ? '⭐' :
                                    pattern.type === 'coordinated_cluster' ? '🔗' :
                                    pattern.type === 'bridge_wallet' ? '🌉' :
                                    pattern.type === 'lp_drain' ? '💧' :
                                    pattern.type === 'sniper_bot' ? '🎯' : '🔴';
                
                const confidenceColor = pattern.confidence > 0.8 ? 'text-red-500' :
                                       pattern.confidence > 0.5 ? 'text-yellow-500' : 'text-green-500';
                
                return (
                  <div key={idx} className="p-3 bg-muted rounded-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <span>{patternEmoji}</span>
                          <span className="capitalize">{pattern.type?.replace(/_/g, ' ') || 'Unknown'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{pattern.description}</p>
                      </div>
                      <Badge variant="outline" className={`${confidenceColor} border-current`}>
                        {(pattern.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {tgnResult.patterns.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{tgnResult.patterns.length - 5} more patterns detected
                </p>
              )}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {tgnResult.riskFactors.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-sm">Risk Factors:</p>
            <ul className="space-y-1">
              {tgnResult.riskFactors.slice(0, 5).map((factor, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info Footer */}
        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Temporal GNN</strong> uses graph neural networks to analyze transaction patterns over time,
            achieving 96.6% F1-score on the SolRPDS dataset. Significantly outperforms static heuristics by 10-18%.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default TGNAnalysisCard;
