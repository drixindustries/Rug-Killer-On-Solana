import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertTriangle, TrendingUp } from "lucide-react";
import type { RugcheckData } from "@shared/schema";

interface RugcheckCardProps {
  data: RugcheckData;
  tokenAddress: string;
}

export function RugcheckCard({ data, tokenAddress }: RugcheckCardProps) {
  const getRiskBadge = (score: number) => {
    if (score >= 8) {
      return {
        variant: "default" as const,
        color: "text-green-600",
        icon: <ShieldCheck className="h-4 w-4" />,
        text: "Low Risk",
      };
    } else if (score >= 5) {
      return {
        variant: "secondary" as const,
        color: "text-yellow-600",
        icon: <ShieldAlert className="h-4 w-4" />,
        text: "Medium Risk",
      };
    } else {
      return {
        variant: "destructive" as const,
        color: "text-red-600",
        icon: <AlertTriangle className="h-4 w-4" />,
        text: "High Risk",
      };
    }
  };

  const riskBadge = getRiskBadge(data.score);

  return (
    <Card className="p-6" data-testid="card-rugcheck">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Rugcheck Analysis</h3>
          <p className="text-sm text-muted-foreground">External verification</p>
        </div>
        <Badge variant={riskBadge.variant} className="gap-1">
          {riskBadge.icon}
          {riskBadge.text}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold" data-testid="text-rugcheck-score">
            {(typeof data.score === 'number' ? data.score.toFixed(1) : '0.0')}
          </span>
          <span className="text-sm text-muted-foreground">/ 10</span>
        </div>

        {data.risks && data.risks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Detected Risks:</p>
            <div className="space-y-1">
              {data.risks.map((risk, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`rugcheck-risk-${index}`}
                >
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.markets && data.markets.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-semibold text-muted-foreground">Liquidity Pools:</p>
            <div className="space-y-2">
              {data.markets.slice(0, 3).map((market, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm"
                  data-testid={`rugcheck-market-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">{market.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs">
                      ${(market.liquidity || 0).toLocaleString()}
                    </div>
                    {market.lpBurn > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {(typeof market.lpBurn === 'number' ? market.lpBurn.toFixed(1) : '0.0')}% burned
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t">
          <a
            href={`https://rugcheck.xyz/tokens/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            data-testid="link-rugcheck"
          >
            View full report on Rugcheck.xyz
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </Card>
  );
}

export default RugcheckCard;
