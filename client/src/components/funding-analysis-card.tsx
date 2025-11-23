import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users, CreditCard } from 'lucide-react';
import type { FundingAnalysisData } from '@shared/schema';

interface FundingAnalysisCardProps {
  fundingData: FundingAnalysisData;
}

export function FundingAnalysisCard({ fundingData }: FundingAnalysisCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 border-red-200';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH_RISK': return 'bg-red-500';
      case 'MEDIUM_RISK': return 'bg-yellow-500';
      case 'LOW_RISK': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const criticalPatterns = fundingData.fundingPatterns.filter(p => p.severity === 'critical');
  const highRiskSources = Object.entries(fundingData.fundingSourceBreakdown)
    .filter(([source, percentage]) => percentage >= 5)
    .sort(([,a], [,b]) => b - a);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Funding Source Analysis</CardTitle>
          </div>
          {fundingData.suspiciousFunding && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              SUSPICIOUS
            </Badge>
          )}
        </div>
        <CardDescription>
          Nova-style detection of coordinated funding patterns
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suspicious Funding Alert */}
        {fundingData.suspiciousFunding && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">High-Risk Funding Detected</h4>
                <p className="text-sm text-red-700 mt-1">
                  {(typeof fundingData.totalSuspiciousPercentage === 'number' ? fundingData.totalSuspiciousPercentage.toFixed(1) : '0.0')}% of token supply funded by suspicious sources.
                  Similar to patterns Nova detects in bundled tokens.
                </p>
                {highRiskSources.length > 0 && (
                  <p className="text-sm text-red-600 mt-2 font-medium">
                    Sources: {highRiskSources.map(([source, percentage]) => 
                      `${source} (${typeof percentage === 'number' ? percentage.toFixed(1) : '0.0'}%)`
                    ).join(' and ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Funding Source Breakdown */}
        {Object.keys(fundingData.fundingSourceBreakdown).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Funding Source Breakdown
            </h4>
            <div className="space-y-2">
              {Object.entries(fundingData.fundingSourceBreakdown)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([source, percentage]) => {
                  const riskLevel = fundingData.walletFunding.find(w => w.fundingSource === source)?.riskLevel || 'UNKNOWN';
                  return (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getRiskLevelColor(riskLevel)}`} />
                        <span className="text-sm font-medium">{source}</span>
                        <Badge variant="outline" className="text-xs">
                          {riskLevel.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getRiskLevelColor(riskLevel)}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 min-w-[3rem] text-right">
                          {(typeof percentage === 'number' ? percentage.toFixed(1) : '0.0')}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Critical Patterns */}
        {criticalPatterns.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical Patterns Detected
            </h4>
            <div className="space-y-2">
              {criticalPatterns.map((pattern, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(pattern.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pattern.description}</p>
                      <p className="text-xs opacity-75 mt-1">
                        Confidence: {pattern.confidence}% • Type: {pattern.type.replace(/_/g, ' ')}
                      </p>
                      {pattern.evidence.fundingSource && (
                        <p className="text-xs mt-1">
                          Source: {pattern.evidence.fundingSource}
                          {pattern.evidence.walletCount && ` • ${pattern.evidence.walletCount} wallets`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fresh Wallet Analysis */}
        {fundingData.walletFunding.some(w => w.isRecentlyCreated) && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Fresh Wallet Activity
            </h4>
            <div className="text-sm text-gray-600">
              {fundingData.walletFunding.filter(w => w.isRecentlyCreated).length} recently created wallets detected.
              {fundingData.walletFunding.filter(w => w.isRecentlyCreated && w.riskLevel === 'HIGH_RISK').length > 0 && 
                ` ${fundingData.walletFunding.filter(w => w.isRecentlyCreated && w.riskLevel === 'HIGH_RISK').length} funded by high-risk sources.`
              }
            </div>
          </div>
        )}

        {/* Risk Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Overall Funding Risk:</span>
            <Badge variant={fundingData.suspiciousFunding ? "destructive" : "secondary"}>
              {fundingData.suspiciousFunding ? "High Risk" : "Normal"}
            </Badge>
          </div>
          {fundingData.risks.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {fundingData.risks[0]}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}