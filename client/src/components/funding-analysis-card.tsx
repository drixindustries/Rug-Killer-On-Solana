import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building2, Repeat, Clock, Link2, Wallet } from "lucide-react";
import type { FundingAnalysisData } from '@shared/schema';

interface FundingAnalysisCardProps {
  fundingData: FundingAnalysisData;
}

export function FundingAnalysisCard({ fundingData }: FundingAnalysisCardProps) {
  // Add null checks and default values
  if (!fundingData) {
    return null;
  }

  const { 
    suspiciousFunding = false, 
    totalSuspiciousPercentage = 0, 
    fundingSourceBreakdown = {}, 
    walletFunding = [], 
    fundingPatterns = [] 
  } = fundingData || {};

  // Categorize sources
  const cexSources = ['Binance', 'Coinbase', 'OKX', 'Bybit'];
  const swapSources = ['Swopshop', 'FixedFloat', 'ChangeNOW', 'SimpleSwap', 'Godex', 'StealthEX'];

  const cexFunding = Object.entries(fundingSourceBreakdown)
    .filter(([source]) => cexSources.includes(source))
    .sort(([, a], [, b]) => b - a);

  const swapFunding = Object.entries(fundingSourceBreakdown)
    .filter(([source]) => swapSources.includes(source))
    .sort(([, a], [, b]) => b - a);

  const otherFunding = Object.entries(fundingSourceBreakdown)
    .filter(([source]) => !cexSources.includes(source) && !swapSources.includes(source))
    .sort(([, a], [, b]) => b - a);

  const freshWallets = walletFunding.filter(w => w.isRecentlyCreated);
  const highRiskWallets = walletFunding.filter(w => w.riskLevel === 'HIGH_RISK');

  const criticalPatterns = fundingPatterns.filter(p => p.severity === 'critical' || p.severity === 'high');

  return (
    <Card className={suspiciousFunding ? "border-red-500 border-2" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle>Funding Source Analysis</CardTitle>
          </div>
          {suspiciousFunding && (
            <Badge variant="destructive" className="font-semibold">
              <AlertTriangle className="w-3 h-3 mr-1" />
              HIGH RISK
            </Badge>
          )}
        </div>
        <CardDescription>
          Where top holders obtained their SOL - detects coordination & insider activity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Critical Alerts */}
        {criticalPatterns.length > 0 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <h4 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Critical Patterns Detected
            </h4>
            <div className="space-y-1">
              {criticalPatterns.map((pattern, i) => (
                <p key={i} className="text-sm text-red-400">
                  • {pattern.description}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Fresh Wallets Alert */}
        {freshWallets.length >= 3 && (
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-orange-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Fresh Wallets (&lt;7 days)
              </h4>
              <Badge variant="outline" className="text-orange-500 border-orange-500">
                {freshWallets.length} wallets
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Recently created wallets detected - may indicate coordinated buying or insider activity
            </p>
          </div>
        )}

        {/* CEX Funding */}
        {cexFunding.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-green-500" />
              Centralized Exchange Funding
            </h4>
            <div className="space-y-2">
              {cexFunding.map(([source, percentage]) => (
                <div key={source} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm font-medium">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-semibold w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Swap Service Funding (HIGH RISK) */}
        {swapFunding.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-red-500" />
              Swap Service Funding (High Risk)
            </h4>
            <div className="space-y-2">
              {swapFunding.map(([source, percentage]) => (
                <div key={source} className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
                  <span className="text-sm font-medium text-red-400">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-semibold w-12 text-right text-red-400">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-400 mt-2">
              ⚠️ Swap services are commonly used to obfuscate wallet origins
            </p>
          </div>
        )}

        {/* Other Funding Sources */}
        {otherFunding.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Other Sources
            </h4>
            <div className="space-y-2">
              {otherFunding.map(([source, percentage]) => (
                <div key={source} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm font-medium">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-semibold w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Summary */}
        {suspiciousFunding && (
          <div className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500">
            <h4 className="text-sm font-semibold text-red-500 mb-1">Total High-Risk Funding</h4>
            <p className="text-3xl font-bold text-red-500">{totalSuspiciousPercentage.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              of token supply held by wallets with suspicious funding sources
            </p>
          </div>
        )}

        {/* Info Footer */}
        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>✓ Analyzes top 20 holder wallets</p>
          <p>✓ Tracks funding from CEX, swap services, bridges, and DEXs</p>
          <p>✓ Detects coordination patterns and fresh wallet clusters</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FundingAnalysisCard;